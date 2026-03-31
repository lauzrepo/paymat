import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Decimal } from '@prisma/client/runtime/library';
import app from '../../src/server';
import prisma from '../../src/config/database';

// Bypass rate limiters in tests
jest.mock('../../src/middleware/rateLimiter', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  authLimiter: (_req: any, _res: any, next: any) => next(),
  paymentLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../src/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn(),
  sendWelcomeEmail: jest.fn(),
  sendInvoiceGenerated: jest.fn(),
  sendPaymentReceived: jest.fn(),
  sendPaymentFailed: jest.fn(),
}));

const TEST_ORG = {
  id: 'org-1',
  name: 'Test Org',
  slug: 'test-org',
  isActive: true,
  email: 'org@test.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PROGRAM_BASE = {
  id: 'prog-1',
  organizationId: 'org-1',
  name: 'Soccer Training',
  description: 'Weekly soccer drills',
  price: new Decimal('150.00'),
  billingFrequency: 'monthly',
  capacity: 20,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  enrollments: [],
  _count: { enrollments: 0 },
};

const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';

function makeToken(overrides: Record<string, unknown> = {}) {
  return jwt.sign(
    { userId: 'user-1', email: 'test@test.com', organizationId: 'org-1', role: 'admin', ...overrides },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

beforeEach(() => {
  (prisma.organization.findFirst as jest.Mock).mockResolvedValue(TEST_ORG);
  (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
});

describe('GET /api/programs', () => {
  it('returns 200 with items and total for authenticated admin', async () => {
    (prisma.program.findMany as jest.Mock).mockResolvedValue([PROGRAM_BASE]);
    (prisma.program.count as jest.Mock).mockResolvedValue(1);

    const token = makeToken();

    const res = await request(app)
      .get('/api/programs')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('programs');
    expect(res.body.data).toHaveProperty('total', 1);
    expect(Array.isArray(res.body.data.programs)).toBe(true);
    expect(res.body.data.programs[0]).toMatchObject({ id: 'prog-1', name: 'Soccer Training' });
  });

  it('returns 200 with an empty list when no programs exist', async () => {
    (prisma.program.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.program.count as jest.Mock).mockResolvedValue(0);

    const token = makeToken();

    const res = await request(app)
      .get('/api/programs')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.programs).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app)
      .get('/api/programs')
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
  });

  it('returns 403 when token belongs to a different organization', async () => {
    const token = makeToken({ organizationId: 'org-other' });

    const res = await request(app)
      .get('/api/programs')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/programs', () => {
  it('creates a program and returns 201 with the created record', async () => {
    (prisma.program.create as jest.Mock).mockResolvedValue(PROGRAM_BASE);

    const token = makeToken();

    const res = await request(app)
      .post('/api/programs')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Soccer Training',
        description: 'Weekly soccer drills',
        price: 150,
        billingFrequency: 'monthly',
        capacity: 20,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.program).toMatchObject({
      id: 'prog-1',
      name: 'Soccer Training',
    });
  });

  it('returns 500 when name is missing (no validation layer on this route)', async () => {
    // The programs route has no validation middleware — the controller passes
    // the body straight to programService. A missing name reaches prisma.program.create
    // with name: undefined. The mock here simulates a database constraint violation.
    (prisma.program.create as jest.Mock).mockRejectedValueOnce(
      new Error('Argument `name` is missing.')
    );

    const token = makeToken();

    const res = await request(app)
      .post('/api/programs')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 100, billingFrequency: 'monthly' });

    expect(res.status).toBe(500);
  });

  it('returns 500 when price is missing (Decimal rejects undefined)', async () => {
    // programService.createProgram does `new Decimal(data.price)` before calling
    // prisma — passing undefined throws a DecimalError, which bubbles as 500.
    const token = makeToken();

    const res = await request(app)
      .post('/api/programs')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Art Class', billingFrequency: 'monthly' });

    expect(res.status).toBe(500);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/programs')
      .set('x-organization-slug', 'test-org')
      .send({ name: 'Art Class', price: 50, billingFrequency: 'monthly' });

    expect(res.status).toBe(401);
  });

  it('returns 403 for a staff user (admin-only route)', async () => {
    const token = makeToken({ role: 'staff' });

    const res = await request(app)
      .post('/api/programs')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Art Class', price: 50, billingFrequency: 'monthly' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/programs/:id', () => {
  it('returns 200 with program details for a valid id', async () => {
    (prisma.program.findFirst as jest.Mock).mockResolvedValue(PROGRAM_BASE);

    const token = makeToken();

    const res = await request(app)
      .get('/api/programs/prog-1')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.program).toMatchObject({ id: 'prog-1', name: 'Soccer Training' });
  });

  it('returns 404 for an unknown program id', async () => {
    (prisma.program.findFirst as jest.Mock).mockResolvedValue(null);

    const token = makeToken();

    const res = await request(app)
      .get('/api/programs/does-not-exist')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });
});

describe('PATCH /api/programs/:id', () => {
  it('updates program fields and returns 200', async () => {
    // getProgramById is called first inside updateProgram service
    (prisma.program.findFirst as jest.Mock).mockResolvedValue(PROGRAM_BASE);
    const updated = { ...PROGRAM_BASE, name: 'Advanced Soccer', price: new Decimal('175.00') };
    (prisma.program.update as jest.Mock).mockResolvedValue(updated);

    const token = makeToken();

    // The router uses PUT for updates, not PATCH
    const res = await request(app)
      .put('/api/programs/prog-1')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Advanced Soccer', price: 175 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.program).toMatchObject({ name: 'Advanced Soccer' });
  });

  it('returns 404 when updating a program that does not exist', async () => {
    (prisma.program.findFirst as jest.Mock).mockResolvedValue(null);

    const token = makeToken();

    const res = await request(app)
      .put('/api/programs/ghost-id')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ghost Program' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/programs/:id', () => {
  it('returns 200 when there are no active enrollments', async () => {
    (prisma.enrollment.count as jest.Mock).mockResolvedValue(0);
    (prisma.program.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    const token = makeToken();

    const res = await request(app)
      .delete('/api/programs/prog-1')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('returns 409 (or 400) when program has active enrollments', async () => {
    (prisma.enrollment.count as jest.Mock).mockResolvedValue(3);

    const token = makeToken();

    const res = await request(app)
      .delete('/api/programs/prog-1')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`);

    // Controller throws AppError(400) for active enrollments
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch(/active enrollments/i);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .delete('/api/programs/prog-1')
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(401);
  });

  it('returns 403 for a staff user (admin-only route)', async () => {
    const token = makeToken({ role: 'staff' });

    const res = await request(app)
      .delete('/api/programs/prog-1')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
