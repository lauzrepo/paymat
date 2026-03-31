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
}));

const SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
const ORG = { id: 'org-1', name: 'Test Org', slug: 'test-org', isActive: true };

function adminToken() {
  return jwt.sign({ userId: 'user-1', email: 'admin@test.com', organizationId: 'org-1', role: 'admin' }, SECRET, { expiresIn: '1h' });
}

const mockInvoice = (overrides = {}) => ({
  id: 'inv-1', organizationId: 'org-1', contactId: 'contact-1', familyId: null,
  invoiceNumber: 'INV-00001', amountDue: new Decimal(100), amountPaid: new Decimal(0),
  currency: 'USD', status: 'sent', dueDate: new Date(), paidAt: null, notes: null,
  lineItems: [], contact: null, family: null, payments: [],
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

beforeEach(() => {
  (prisma.organization.findFirst as jest.Mock).mockResolvedValue(ORG);
});

describe('GET /api/invoices', () => {
  it('returns 200 with invoice list', async () => {
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice()]);
    (prisma.invoice.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.invoices).toHaveLength(1);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/invoices').set('x-organization-slug', 'test-org');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/invoices/stats', () => {
  it('returns 200 with stats', async () => {
    (prisma.invoice.count as jest.Mock).mockResolvedValue(5);
    (prisma.invoice.aggregate as jest.Mock).mockResolvedValue({ _sum: { amountDue: new Decimal(500), amountPaid: new Decimal(300) } });

    const res = await request(app)
      .get('/api/invoices/stats')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.stats).toHaveProperty('total');
  });
});

describe('POST /api/invoices', () => {
  it('creates an invoice and returns 201', async () => {
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (prisma.invoice.create as jest.Mock).mockResolvedValue(mockInvoice());

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({
        contactId: 'contact-1',
        dueDate: '2026-04-30',
        lineItems: [{ description: 'Monthly fee', unitPrice: 100 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.invoice.invoiceNumber).toBe('INV-00001');
  });

  it('returns 400 if neither contactId nor familyId provided', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ dueDate: '2026-04-30', lineItems: [{ description: 'Fee', unitPrice: 50 }] });

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/invoices').set('x-organization-slug', 'test-org').send({});
    expect(res.status).toBe(401);
  });
});

describe('GET /api/invoices/:id', () => {
  it('returns 200 with invoice details', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice());

    const res = await request(app)
      .get('/api/invoices/inv-1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.invoice.id).toBe('inv-1');
  });

  it('returns 404 for unknown invoice', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/invoices/unknown')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/invoices/:id/mark-paid', () => {
  it('marks invoice as paid and returns 200', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice({ status: 'sent' }));
    (prisma.invoice.update as jest.Mock).mockResolvedValue(mockInvoice({ status: 'paid', amountPaid: new Decimal(100) }));

    const res = await request(app)
      .post('/api/invoices/inv-1/mark-paid')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
  });

  it('returns 400 if invoice is already paid', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice({ status: 'paid' }));

    const res = await request(app)
      .post('/api/invoices/inv-1/mark-paid')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(400);
  });
});

describe('POST /api/invoices/:id/void', () => {
  it('voids an unpaid invoice and returns 200', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice({ status: 'sent' }));
    (prisma.invoice.update as jest.Mock).mockResolvedValue(mockInvoice({ status: 'void' }));

    const res = await request(app)
      .post('/api/invoices/inv-1/void')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
  });

  it('returns 400 if invoice is already paid', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice({ status: 'paid' }));

    const res = await request(app)
      .post('/api/invoices/inv-1/void')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(400);
  });
});
