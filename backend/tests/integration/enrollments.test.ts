import request from 'supertest';
import app from '../../src/server';
import jwt from 'jsonwebtoken';
import prisma from '../../src/config/database';

jest.mock('../../src/middleware/rateLimiter', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  authLimiter: (_req: any, _res: any, next: any) => next(),
  paymentLimiter: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../src/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn(),
  sendFeedbackNotification: jest.fn().mockResolvedValue(undefined),
  sendInvoiceGenerated: jest.fn().mockResolvedValue(undefined),
}));

const SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
const ORG = { id: 'org-1', name: 'Test Org', slug: 'test-org', isActive: true };

function adminToken() {
  return jwt.sign({ userId: 'user-1', email: 'admin@test.com', organizationId: 'org-1', role: 'admin' }, SECRET, { expiresIn: '1h' });
}

const mockEnrollment = (overrides = {}) => ({
  id: 'enroll-1', contactId: 'contact-1', programId: 'prog-1',
  status: 'active', startDate: new Date(), endDate: null, nextBillingDate: new Date(),
  createdAt: new Date(), updatedAt: new Date(),
  contact: { id: 'contact-1', firstName: 'Jane', lastName: 'Doe', email: null, organizationId: 'org-1' },
  program: { id: 'prog-1', name: 'Soccer', price: 100, billingFrequency: 'monthly' },
  ...overrides,
});

beforeEach(() => {
  (prisma.organization.findFirst as jest.Mock).mockResolvedValue(ORG);
});

describe('GET /api/enrollments', () => {
  it('returns 200 with enrollments list', async () => {
    (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([mockEnrollment()]);
    (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/enrollments')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.enrollments).toHaveLength(1);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/enrollments').set('x-organization-slug', 'test-org');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/enrollments', () => {
  it('enrolls a contact and returns 201', async () => {
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue({ id: 'contact-1', organizationId: 'org-1' });
    (prisma.program.findFirst as jest.Mock).mockResolvedValue({ id: 'prog-1', organizationId: 'org-1', isActive: true, capacity: null });
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.enrollment.create as jest.Mock).mockResolvedValue(mockEnrollment());

    const res = await request(app)
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ contactId: 'contact-1', programId: 'prog-1', startDate: '2026-04-01' });

    expect(res.status).toBe(201);
    expect(res.body.data.enrollment.id).toBe('enroll-1');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/enrollments').set('x-organization-slug', 'test-org').send({});
    expect(res.status).toBe(401);
  });

  it('returns 409 when already enrolled', async () => {
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue({ id: 'contact-1', organizationId: 'org-1' });
    (prisma.program.findFirst as jest.Mock).mockResolvedValue({ id: 'prog-1', organizationId: 'org-1', isActive: true, capacity: null });
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(mockEnrollment({ status: 'active' }));

    const res = await request(app)
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ contactId: 'contact-1', programId: 'prog-1', startDate: '2026-04-01' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/enrollments/:id', () => {
  it('returns 200 with enrollment details', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(mockEnrollment());

    const res = await request(app)
      .get('/api/enrollments/enroll-1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.enrollment.id).toBe('enroll-1');
  });

  it('returns 404 for unknown enrollment', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/enrollments/unknown')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/enrollments/:id (unenroll)', () => {
  it('unenrolls and returns 200', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(mockEnrollment());
    (prisma.enrollment.update as jest.Mock).mockResolvedValue(mockEnrollment({ status: 'cancelled' }));

    const res = await request(app)
      .delete('/api/enrollments/enroll-1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.enrollment.status).toBe('cancelled');
  });
});

describe('DELETE /api/enrollments/:id/force', () => {
  it('hard deletes enrollment and returns 200', async () => {
    (prisma.enrollment.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    const res = await request(app)
      .delete('/api/enrollments/enroll-1/force')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
  });
});

describe('POST /api/enrollments/:id/pause', () => {
  it('pauses enrollment and returns 200', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(mockEnrollment({ status: 'active' }));
    (prisma.enrollment.update as jest.Mock).mockResolvedValue(mockEnrollment({ status: 'paused' }));

    const res = await request(app)
      .post('/api/enrollments/enroll-1/pause')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
  });
});

describe('POST /api/enrollments/:id/resume', () => {
  it('resumes enrollment and returns 200', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(mockEnrollment({ status: 'paused' }));
    (prisma.enrollment.update as jest.Mock).mockResolvedValue(mockEnrollment({ status: 'active' }));

    const res = await request(app)
      .post('/api/enrollments/enroll-1/resume')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
  });
});
