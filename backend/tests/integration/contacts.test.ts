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
  sendPaymentReceived: jest.fn().mockResolvedValue(undefined),
  sendPaymentFailed: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/helcimService', () => ({
  __esModule: true,
  default: {
    initializeCheckout: jest.fn().mockResolvedValue({ checkoutToken: 'tok_test', secretToken: 'sec_test' }),
    processPayment: jest.fn(),
  },
}));

const SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
const ORG = { id: 'org-1', name: 'Test Org', slug: 'test-org', isActive: true };

function adminToken(orgId = 'org-1') {
  return jwt.sign({ userId: 'user-1', email: 'admin@test.com', organizationId: orgId, role: 'admin' }, SECRET, { expiresIn: '1h' });
}

const mockContact = (overrides = {}) => ({
  id: 'contact-1', organizationId: 'org-1', firstName: 'Jane', lastName: 'Doe',
  email: 'jane@example.com', phone: null, status: 'active', helcimToken: null,
  family: null, enrollments: [], invoices: [],
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

beforeEach(() => {
  (prisma.organization.findFirst as jest.Mock).mockResolvedValue(ORG);
});

describe('GET /api/contacts', () => {
  it('returns 200 with contacts list for authenticated user', async () => {
    (prisma.contact.findMany as jest.Mock).mockResolvedValue([mockContact()]);
    (prisma.contact.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/contacts')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.contacts).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/contacts').set('x-organization-slug', 'test-org');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/contacts', () => {
  it('creates a contact and returns 201', async () => {
    const contact = mockContact();
    (prisma.contact.create as jest.Mock).mockResolvedValue(contact);

    const res = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.data.contact.firstName).toBe('Jane');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/contacts').set('x-organization-slug', 'test-org').send({ firstName: 'X', lastName: 'Y' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/contacts/:id', () => {
  it('returns 200 with contact details', async () => {
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue(mockContact());

    const res = await request(app)
      .get('/api/contacts/contact-1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.contact.id).toBe('contact-1');
  });

  it('returns 404 for unknown contact', async () => {
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/contacts/unknown')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/contacts/:id', () => {
  it('updates contact and returns 200', async () => {
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue(mockContact());
    (prisma.contact.update as jest.Mock).mockResolvedValue(mockContact({ firstName: 'Janet' }));

    const res = await request(app)
      .put('/api/contacts/contact-1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ firstName: 'Janet' });

    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/contacts/:id (deactivate)', () => {
  it('deactivates contact and returns 200', async () => {
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue(mockContact());
    (prisma.enrollment.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.contact.update as jest.Mock).mockResolvedValue(mockContact({ status: 'inactive' }));

    const res = await request(app)
      .delete('/api/contacts/contact-1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/contacts/:id/permanent', () => {
  it('returns 204 when contact has no invoices or payments', async () => {
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue(mockContact());
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.payment.count as jest.Mock).mockResolvedValue(0);
    (prisma.enrollment.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.contact.delete as jest.Mock ?? (prisma as any).contact.delete).mockResolvedValue(mockContact());

    const res = await request(app)
      .delete('/api/contacts/contact-1/permanent')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(204);
  });

  it('returns 400 when contact has invoices', async () => {
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue(mockContact());
    (prisma.invoice.count as jest.Mock).mockResolvedValue(3);
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([{ id: 'inv-1' }]);
    (prisma.payment.count as jest.Mock).mockResolvedValue(0);

    const res = await request(app)
      .delete('/api/contacts/contact-1/permanent')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(400);
  });
});

describe('POST /api/contacts/:id/reactivate', () => {
  it('reactivates contact and returns 200', async () => {
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue(mockContact({ status: 'inactive' }));
    (prisma.contact.update as jest.Mock).mockResolvedValue(mockContact({ status: 'active' }));

    const res = await request(app)
      .post('/api/contacts/contact-1/reactivate')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
  });
});

describe('POST /api/contacts/:id/card/initialize', () => {
  it('returns 200 with checkout token', async () => {
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue(mockContact());

    const res = await request(app)
      .post('/api/contacts/contact-1/card/initialize')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.checkoutToken).toBe('tok_test');
  });
});

describe('POST /api/contacts/:id/card/token', () => {
  it('saves card token and returns 200', async () => {
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue(mockContact());
    (prisma.contact.update as jest.Mock).mockResolvedValue(mockContact({ stripeCustomerId: 'cus_test', stripeDefaultPaymentMethodId: 'pm_test' }));

    const res = await request(app)
      .post('/api/contacts/contact-1/card/token')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ stripeCustomerId: 'cus_test', stripeDefaultPaymentMethodId: 'pm_test' });

    expect(res.status).toBe(200);
  });

  it('returns 400 when cardToken is missing', async () => {
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue(mockContact());

    const res = await request(app)
      .post('/api/contacts/contact-1/card/token')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({});

    expect(res.status).toBe(400);
  });
});
