import request from 'supertest';
import app from '../../src/server';
import jwt from 'jsonwebtoken';
import prisma from '../../src/config/database';
import { Decimal } from '@prisma/client/runtime/library';

jest.mock('../../src/middleware/rateLimiter', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  authLimiter: (_req: any, _res: any, next: any) => next(),
  paymentLimiter: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../src/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn(),
  sendFeedbackNotification: jest.fn().mockResolvedValue(undefined),
  sendInvoiceGenerated: jest.fn().mockResolvedValue(undefined),
  sendPaymentReceived: jest.fn().mockResolvedValue(undefined),
  sendPaymentFailed: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/helcimService', () => ({
  __esModule: true,
  default: {
    processPayment: jest.fn().mockResolvedValue({ transactionId: 'txn-123', status: 'succeeded' }),
    refundTransaction: jest.fn().mockResolvedValue({ transactionId: 'ref-123', status: 'succeeded' }),
  },
}));

const SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
const ORG = { id: 'org-1', name: 'Test Org', slug: 'test-org', isActive: true };

function adminToken() {
  return jwt.sign({ userId: 'user-1', email: 'admin@test.com', organizationId: 'org-1', role: 'admin' }, SECRET, { expiresIn: '1h' });
}

const mockPayment = (overrides = {}) => ({
  id: 'pay-1', organizationId: 'org-1', invoiceId: 'inv-1',
  userId: 'user-1', helcimTransactionId: 'txn-123',
  amount: new Decimal(100), currency: 'USD', status: 'succeeded',
  paymentMethodType: 'card', cardToken: null, notes: null,
  refundedAmount: new Decimal(0), refundedAt: null,
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

const mockInvoice = (overrides = {}) => ({
  id: 'inv-1', organizationId: 'org-1', contactId: 'contact-1',
  status: 'sent', amountDue: new Decimal(100), amountPaid: new Decimal(0),
  contact: { helcimToken: null },
  ...overrides,
});

beforeEach(() => {
  (prisma.organization.findFirst as jest.Mock).mockResolvedValue(ORG);
});

describe('GET /api/payments', () => {
  it('returns 200 with payments list', async () => {
    (prisma.payment.findMany as jest.Mock).mockResolvedValue([mockPayment()]);
    (prisma.payment.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/payments')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.payments).toHaveLength(1);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/payments').set('x-organization-slug', 'test-org');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/payments/stats', () => {
  it('returns 200 with stats', async () => {
    (prisma.payment.count as jest.Mock).mockResolvedValue(10);
    (prisma.payment.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: new Decimal(1000) } });

    const res = await request(app)
      .get('/api/payments/stats')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.stats).toBeDefined();
  });
});

describe('GET /api/payments/:id', () => {
  it('returns 200 with payment details', async () => {
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment());

    const res = await request(app)
      .get('/api/payments/pay-1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.payment.id).toBe('pay-1');
  });

  it('returns 404 for unknown payment', async () => {
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/payments/unknown')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/payments', () => {
  it('processes a manual payment and returns 201', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice());
    (prisma.payment.create as jest.Mock).mockResolvedValue(mockPayment());
    (prisma.invoice.update as jest.Mock).mockResolvedValue(mockInvoice({ status: 'paid' }));
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ invoiceId: 'inv-1', amount: 100, paymentMethodType: 'cash' });

    expect(res.status).toBe(201);
    expect(res.body.data.payment.id).toBe('pay-1');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/payments').set('x-organization-slug', 'test-org').send({});
    expect(res.status).toBe(401);
  });
});

describe('POST /api/payments/:id/refund', () => {
  it('refunds a payment and returns 200', async () => {
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment());
    (prisma.payment.update as jest.Mock).mockResolvedValue(mockPayment({ status: 'refunded' }));
    (prisma.invoice.update as jest.Mock).mockResolvedValue(mockInvoice());
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post('/api/payments/pay-1/refund')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ amount: 100, reason: 'Customer request' });

    expect(res.status).toBe(200);
  });

  it('returns 400 if payment is already refunded', async () => {
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment({ status: 'refunded' }));

    const res = await request(app)
      .post('/api/payments/pay-1/refund')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ amount: 100 });

    expect(res.status).toBe(400);
  });
});
