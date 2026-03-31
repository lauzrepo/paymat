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
jest.mock('../../src/services/helcimService', () => ({
  __esModule: true,
  default: {
    processPayment: jest.fn(),
  },
}));

const SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
const ORG = { id: 'org-1', name: 'Test Org', slug: 'test-org', isActive: true };

function adminToken() {
  return jwt.sign({ userId: 'user-1', email: 'admin@test.com', organizationId: 'org-1', role: 'admin' }, SECRET, { expiresIn: '1h' });
}

beforeEach(() => {
  (prisma.organization.findFirst as jest.Mock).mockResolvedValue(ORG);
  // billing run hits enrollment + invoice queries
  (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
});

describe('POST /api/billing/run', () => {
  it('returns 200 with billing result when authenticated as admin', async () => {
    const res = await request(app)
      .post('/api/billing/run')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toBeDefined();
  });

  it('returns 200 when using BILLING_SECRET header', async () => {
    const res = await request(app)
      .post('/api/billing/run')
      .set('x-billing-secret', 'test-billing-secret');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('returns 401 without auth or secret', async () => {
    const res = await request(app).post('/api/billing/run');
    expect(res.status).toBe(401);
  });

  it('returns 401 with wrong BILLING_SECRET', async () => {
    const res = await request(app)
      .post('/api/billing/run')
      .set('x-billing-secret', 'wrong-secret');

    expect(res.status).toBe(401);
  });
});
