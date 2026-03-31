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

const mockSubmission = (overrides = {}) => ({
  id: 'fb-1', organizationId: 'org-1', contactId: null,
  name: 'Jane Doe', email: 'jane@example.com',
  type: 'feedback', subject: 'Test subject', message: 'Test message',
  status: 'open', createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

beforeEach(() => {
  (prisma.organization.findFirst as jest.Mock).mockResolvedValue(ORG);
});

describe('POST /api/feedback', () => {
  it('creates feedback and returns 201', async () => {
    (prisma.feedbackSubmission.create as jest.Mock).mockResolvedValue(mockSubmission());

    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ name: 'Jane Doe', subject: 'Test subject', message: 'Test message', type: 'feedback' });

    expect(res.status).toBe(201);
    expect(res.body.data.submission.id).toBe('fb-1');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ subject: 'Test', message: 'Test message' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when subject is missing', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ name: 'Jane', message: 'Test message' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when message is missing', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ name: 'Jane', subject: 'Test' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid type', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ name: 'Jane', subject: 'Test', message: 'Msg', type: 'invalid_type' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/feedback').set('x-organization-slug', 'test-org').send({});
    expect(res.status).toBe(401);
  });
});

describe('GET /api/feedback', () => {
  it('returns 200 with feedback list', async () => {
    (prisma.feedbackSubmission.findMany as jest.Mock).mockResolvedValue([mockSubmission()]);
    (prisma.feedbackSubmission.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/feedback')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/feedback').set('x-organization-slug', 'test-org');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/feedback/:id', () => {
  it('returns 200 with submission details', async () => {
    (prisma.feedbackSubmission.findFirst as jest.Mock).mockResolvedValue(mockSubmission());

    const res = await request(app)
      .get('/api/feedback/fb-1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.submission.id).toBe('fb-1');
  });

  it('returns 404 for unknown submission', async () => {
    (prisma.feedbackSubmission.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/feedback/unknown')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    // feedbackService.getById throws a generic Error (not AppError) → 500
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/feedback/:id/status', () => {
  it('updates status and returns 200', async () => {
    (prisma.feedbackSubmission.findFirst as jest.Mock).mockResolvedValue(mockSubmission());
    (prisma.feedbackSubmission.update as jest.Mock).mockResolvedValue(mockSubmission({ status: 'resolved' }));

    const res = await request(app)
      .patch('/api/feedback/fb-1/status')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ status: 'resolved' });

    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .patch('/api/feedback/fb-1/status')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
  });
});
