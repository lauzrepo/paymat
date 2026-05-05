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
  sendPaymentReceived: jest.fn().mockResolvedValue(undefined),
  sendInvoiceGenerated: jest.fn().mockResolvedValue(undefined),
  sendFeedbackNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/stripeConnectService', () => ({
  __esModule: true,
  default: {
    createCustomer: jest.fn().mockResolvedValue('cus_test'),
    createPaymentIntent: jest.fn().mockResolvedValue({ clientSecret: 'pi_test_secret', paymentIntentId: 'pi_test' }),
    retrievePaymentIntent: jest.fn(),
    getPublishableKey: jest.fn().mockReturnValue('pk_test_placeholder'),
  },
}));

const SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
const ORG = { id: 'org-1', name: 'Test Org', slug: 'test-org', isActive: true, sandboxMode: true };

function clientToken() {
  return jwt.sign({ userId: 'user-1', email: 'client@test.com', organizationId: 'org-1', role: 'client' }, SECRET, { expiresIn: '1h' });
}

const mockUser = (overrides = {}) => ({
  id: 'user-1', email: 'client@test.com', organizationId: 'org-1',
  role: 'client', contactId: 'contact-1',
  contact: {
    id: 'contact-1', firstName: 'Jane', lastName: 'Doe', familyId: null,
    family: null, enrollments: [],
  },
  ...overrides,
});

beforeEach(() => {
  (prisma.organization.findFirst as jest.Mock).mockResolvedValue(ORG);
});

describe('GET /api/client/me', () => {
  it('returns 200 with user profile', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser());

    const res = await request(app)
      .get('/api/client/me')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe('user-1');
  });

  it('returns 404 if user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/client/me')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(404);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/client/me').set('x-organization-slug', 'test-org');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/client/enrollments', () => {
  it('returns 200 with enrollments list', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser());
    (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/client/enrollments')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.enrollments).toEqual([]);
  });

  it('returns empty list if user has no contactId', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser({ contactId: null, contact: null }));

    const res = await request(app)
      .get('/api/client/enrollments')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.enrollments).toEqual([]);
  });
});

describe('GET /api/client/invoices', () => {
  it('returns 200 with invoices list', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser());
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);

    const res = await request(app)
      .get('/api/client/invoices')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.invoices).toEqual([]);
  });

  it('returns empty list if user has no contactId', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser({ contactId: null, contact: null }));

    const res = await request(app)
      .get('/api/client/invoices')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
  });
});

describe('GET /api/client/invoices/:id', () => {
  it('returns 200 with invoice details', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser());
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
      id: 'inv-1', amountDue: new Decimal(100), lineItems: [], payments: [],
    });

    const res = await request(app)
      .get('/api/client/invoices/inv-1')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.invoice.id).toBe('inv-1');
  });

  it('returns 403 if user has no contactId', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser({ contactId: null, contact: null }));

    const res = await request(app)
      .get('/api/client/invoices/inv-1')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(403);
  });

  it('returns 404 if invoice not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser());
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/client/invoices/unknown')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/client/invoices/:id/initialize-payment', () => {
  it('returns 200 with clientSecret for payable invoice', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser());
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
      id: 'inv-1', status: 'sent', amountDue: new Decimal(100), amountPaid: new Decimal(0), currency: 'USD',
      invoiceNumber: 'INV-00001',
    });
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ ...ORG, stripeConnectAccountId: 'acct_test', platformFeePercent: 0 });
    (prisma.contact.findUnique as jest.Mock).mockResolvedValue({ stripeCustomerId: 'cus_test', email: 'jane@test.com', firstName: 'Jane', lastName: 'Doe' });

    const res = await request(app)
      .post('/api/client/invoices/inv-1/initialize-payment')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.clientSecret).toBe('pi_test_secret');
  });

  it('returns 404 for non-payable invoice', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser());
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/client/invoices/inv-1/initialize-payment')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/client/payments', () => {
  it('returns 200 with payments list', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser());
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([{ id: 'inv-1' }]);
    (prisma.payment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.payment.count as jest.Mock).mockResolvedValue(0);

    const res = await request(app)
      .get('/api/client/payments')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.payments).toEqual([]);
  });
});

describe('POST /api/client/invoices/:id/confirm-payment', () => {
  const stripeConnect = require('../../src/services/stripeConnectService').default;

  const mockInvoice = {
    id: 'inv-1',
    organizationId: 'org-1',
    invoiceNumber: 'INV-00001',
    amountDue: new Decimal(100),
    amountPaid: new Decimal(0),
    currency: 'USD',
    status: 'sent',
    contact: { email: 'jane@test.com', firstName: 'Jane', lastName: 'Doe' },
    family: null,
  };

  const mockIntent = {
    id: 'pi_test_confirm',
    status: 'succeeded',
    amount: 10000,
    currency: 'usd',
    metadata: { invoiceId: 'inv-1', invoiceNumber: 'INV-00001' },
    latest_charge: 'ch_test',
  };

  const mockUpdatedInvoice = {
    ...mockInvoice,
    status: 'paid',
    amountPaid: new Decimal(100),
    lineItems: [],
    payments: [{ id: 'pay-1', amount: new Decimal(100) }],
  };

  beforeEach(() => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser());
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      ...ORG, stripeConnectAccountId: 'acct_test', name: 'Test Org',
    });
    (stripeConnect.retrievePaymentIntent as jest.Mock).mockResolvedValue(mockIntent);
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.payment.create as jest.Mock).mockResolvedValue({ id: 'pay-1' });
    (prisma.invoice.update as jest.Mock).mockResolvedValue({});
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockUpdatedInvoice);
  });

  it('returns 200 and marks invoice paid on successful payment intent', async () => {
    const res = await request(app)
      .post('/api/client/invoices/inv-1/confirm-payment')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ paymentIntentId: 'pi_test_confirm' });

    expect(res.status).toBe(200);
    expect(res.body.data.invoice.status).toBe('paid');
    expect(prisma.payment.create as jest.Mock).toHaveBeenCalledTimes(1);
    expect(prisma.invoice.update as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: expect.objectContaining({ status: 'paid' }),
      }),
    );
  });

  it('is idempotent — skips payment creation if payment already exists', async () => {
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({ id: 'pay-existing', stripeChargeId: 'ch_test', status: 'succeeded' });

    const res = await request(app)
      .post('/api/client/invoices/inv-1/confirm-payment')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ paymentIntentId: 'pi_test_confirm' });

    expect(res.status).toBe(200);
    expect(prisma.payment.create as jest.Mock).not.toHaveBeenCalled();
  });

  it('returns 400 if paymentIntentId is missing', async () => {
    const res = await request(app)
      .post('/api/client/invoices/inv-1/confirm-payment')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 if payment intent has not succeeded', async () => {
    (stripeConnect.retrievePaymentIntent as jest.Mock).mockResolvedValue({
      ...mockIntent, status: 'processing',
    });

    const res = await request(app)
      .post('/api/client/invoices/inv-1/confirm-payment')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ paymentIntentId: 'pi_test_confirm' });

    expect(res.status).toBe(400);
  });

  it('returns 403 if payment intent belongs to a different invoice', async () => {
    (stripeConnect.retrievePaymentIntent as jest.Mock).mockResolvedValue({
      ...mockIntent, metadata: { invoiceId: 'inv-OTHER' },
    });

    const res = await request(app)
      .post('/api/client/invoices/inv-1/confirm-payment')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ paymentIntentId: 'pi_test_confirm' });

    expect(res.status).toBe(403);
  });

  it('returns 404 if invoice not found', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/client/invoices/inv-1/confirm-payment')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ paymentIntentId: 'pi_test_confirm' });

    expect(res.status).toBe(404);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/client/invoices/inv-1/confirm-payment')
      .set('x-organization-slug', 'test-org')
      .send({ paymentIntentId: 'pi_test_confirm' });

    expect(res.status).toBe(401);
  });

  it('passes sandboxMode from org to retrievePaymentIntent', async () => {
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      ...ORG, stripeConnectAccountId: 'acct_test', name: 'Test Org', sandboxMode: false,
    });

    await request(app)
      .post('/api/client/invoices/inv-1/confirm-payment')
      .set('Authorization', `Bearer ${clientToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ paymentIntentId: 'pi_test_confirm' });

    expect(stripeConnect.retrievePaymentIntent as jest.Mock).toHaveBeenCalledWith(
      'acct_test', 'pi_test_confirm', false,
    );
  });
});
