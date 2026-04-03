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
    initializeCheckout: jest.fn().mockResolvedValue({ checkoutToken: 'tok_test', secretToken: 'sec_test' }),
  },
}));

const SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
const ORG = { id: 'org-1', name: 'Test Org', slug: 'test-org', isActive: true };

function adminToken() {
  return jwt.sign({ userId: 'user-1', email: 'admin@test.com', organizationId: 'org-1', role: 'admin' }, SECRET, { expiresIn: '1h' });
}

const mockFamily = (overrides = {}) => ({
  id: 'fam-1', organizationId: 'org-1', name: 'Smith Family',
  billingEmail: null, helcimToken: null, contacts: [], invoices: [],
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

beforeEach(() => {
  (prisma.organization.findFirst as jest.Mock).mockResolvedValue(ORG);
});

describe('GET /api/families', () => {
  it('returns 200 with families list', async () => {
    (prisma.family.findMany as jest.Mock).mockResolvedValue([mockFamily()]);
    (prisma.family.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/families')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.families).toHaveLength(1);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/families').set('x-organization-slug', 'test-org');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/families', () => {
  it('creates a family and returns 201', async () => {
    (prisma.family.create as jest.Mock).mockResolvedValue(mockFamily());

    const res = await request(app)
      .post('/api/families')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ name: 'Smith Family' });

    expect(res.status).toBe(201);
    expect(res.body.data.family.name).toBe('Smith Family');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/families').set('x-organization-slug', 'test-org').send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/families/:id', () => {
  it('returns 200 with family details', async () => {
    (prisma.family.findFirst as jest.Mock).mockResolvedValue(mockFamily());

    const res = await request(app)
      .get('/api/families/fam-1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.family.id).toBe('fam-1');
  });

  it('returns 404 for unknown family', async () => {
    (prisma.family.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/families/unknown')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/families/:id', () => {
  it('updates family and returns 200', async () => {
    (prisma.family.findFirst as jest.Mock).mockResolvedValue(mockFamily());
    (prisma.family.update as jest.Mock).mockResolvedValue(mockFamily({ name: 'Jones Family' }));

    const res = await request(app)
      .put('/api/families/fam-1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ name: 'Jones Family' });

    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown family', async () => {
    (prisma.family.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .put('/api/families/unknown')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/families/:id', () => {
  it('returns 200 when family has no contacts', async () => {
    (prisma.family.findFirst as jest.Mock).mockResolvedValue(mockFamily({ contacts: [] }));
    (prisma.family.delete as jest.Mock ?? (prisma as any).family.delete).mockResolvedValue(mockFamily());

    const res = await request(app)
      .delete('/api/families/fam-1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(204);
  });

  it('returns 400 when family has contacts', async () => {
    (prisma.family.findFirst as jest.Mock).mockResolvedValue(mockFamily({ contacts: [{ id: 'c1' }] }));

    const res = await request(app)
      .delete('/api/families/fam-1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).delete('/api/families/fam-1').set('x-organization-slug', 'test-org');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/families/:id/card/initialize', () => {
  it('returns 200 with checkout token', async () => {
    (prisma.family.findFirst as jest.Mock).mockResolvedValue(mockFamily());

    const res = await request(app)
      .post('/api/families/fam-1/card/initialize')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.checkoutToken).toBe('tok_test');
  });
});

describe('POST /api/families/:id/card/token', () => {
  it('saves card token and returns 200', async () => {
    (prisma.family.findFirst as jest.Mock).mockResolvedValue(mockFamily());
    (prisma.family.update as jest.Mock).mockResolvedValue(mockFamily({ stripeCustomerId: 'cus_fam_test', stripeDefaultPaymentMethodId: 'pm_fam_test' }));

    const res = await request(app)
      .post('/api/families/fam-1/card/token')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ stripeCustomerId: 'cus_fam_test', stripeDefaultPaymentMethodId: 'pm_fam_test' });

    expect(res.status).toBe(200);
  });

  it('returns 400 when cardToken is missing', async () => {
    (prisma.family.findFirst as jest.Mock).mockResolvedValue(mockFamily());

    const res = await request(app)
      .post('/api/families/fam-1/card/token')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({});

    expect(res.status).toBe(400);
  });
});
