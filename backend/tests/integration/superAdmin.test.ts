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
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn(),
}));
jest.mock('../../src/services/stripeConnectService', () => ({
  __esModule: true,
  default: {
    createConnectAccount: jest.fn().mockResolvedValue('acct_live_new'),
    createAccountOnboardingLink: jest.fn().mockResolvedValue('https://connect.stripe.com/onboard/live'),
  },
}));

const SUPER_ADMIN_SECRET = 'test-super-admin-jwt-secret-at-least-32-chars';
const SUPER_ADMIN_REFRESH_SECRET = 'test-super-admin-refresh-secret-32-chars-ok';

function superAdminToken() {
  return jwt.sign({ superAdminId: 'sa-1', email: 'superadmin@test.com' }, SUPER_ADMIN_SECRET, { expiresIn: '15m' });
}

function superAdminRefreshToken() {
  return jwt.sign({ superAdminId: 'sa-1', email: 'superadmin@test.com' }, SUPER_ADMIN_REFRESH_SECRET, { expiresIn: '7d' });
}

const mockSuperAdmin = (overrides = {}) => ({
  id: 'sa-1', email: 'superadmin@test.com', name: 'Super Admin',
  passwordHash: 'hashed', createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

const mockOrg = (overrides = {}) => ({
  id: 'org-1', name: 'Test Org', slug: 'test-org', isActive: true,
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

describe('POST /super-admin/auth/login', () => {
  it('returns 200 with tokens for valid credentials', async () => {
    const bcrypt = require('bcrypt');
    (prisma.superAdmin.findUnique as jest.Mock).mockResolvedValue(mockSuperAdmin());
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post('/super-admin/auth/login')
      .send({ email: 'superadmin@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('returns 400 if email or password is missing', async () => {
    const res = await request(app)
      .post('/super-admin/auth/login')
      .send({ email: 'superadmin@test.com' });

    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid credentials', async () => {
    const bcrypt = require('bcrypt');
    (prisma.superAdmin.findUnique as jest.Mock).mockResolvedValue(mockSuperAdmin());
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post('/super-admin/auth/login')
      .send({ email: 'superadmin@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('returns 401 if super admin not found', async () => {
    (prisma.superAdmin.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/super-admin/auth/login')
      .send({ email: 'nobody@test.com', password: 'password' });

    expect(res.status).toBe(401);
  });
});

describe('POST /super-admin/auth/refresh-token', () => {
  it('returns 200 with new tokens for valid refresh token', async () => {
    (prisma.superAdmin.findUnique as jest.Mock).mockResolvedValue(mockSuperAdmin());

    const res = await request(app)
      .post('/super-admin/auth/refresh-token')
      .send({ refreshToken: superAdminRefreshToken() });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('returns 400 if refresh token is missing', async () => {
    const res = await request(app)
      .post('/super-admin/auth/refresh-token')
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid refresh token', async () => {
    const res = await request(app)
      .post('/super-admin/auth/refresh-token')
      .send({ refreshToken: 'invalid.token.here' });

    expect(res.status).toBe(401);
  });
});

describe('GET /super-admin/auth/me', () => {
  it('returns 200 with super admin profile', async () => {
    (prisma.superAdmin.findUnique as jest.Mock).mockResolvedValue(mockSuperAdmin());

    const res = await request(app)
      .get('/super-admin/auth/me')
      .set('Authorization', `Bearer ${superAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.superAdmin.id).toBe('sa-1');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/super-admin/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('GET /super-admin/organizations', () => {
  it('returns 200 with organizations list', async () => {
    (prisma.organization.findMany as jest.Mock).mockResolvedValue([mockOrg()]);
    (prisma.organization.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/super-admin/organizations')
      .set('Authorization', `Bearer ${superAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.organizations).toHaveLength(1);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/super-admin/organizations');
    expect(res.status).toBe(401);
  });
});

describe('POST /super-admin/organizations', () => {
  it('creates organization and returns 201', async () => {
    const bcrypt = require('bcrypt');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    // slug uniqueness check returns null (slug not taken)
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.organization.create as jest.Mock).mockResolvedValue(mockOrg());
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'user-1' });

    const res = await request(app)
      .post('/super-admin/organizations')
      .set('Authorization', `Bearer ${superAdminToken()}`)
      .send({ name: 'Test Org', slug: 'test-org', adminEmail: 'admin@test.com', adminName: 'Admin', adminPassword: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.data.organization.id).toBe('org-1');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/super-admin/organizations').send({});
    expect(res.status).toBe(401);
  });
});

describe('GET /super-admin/organizations/:id', () => {
  it('returns 200 with organization details', async () => {
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg());
    (prisma.payment.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: null } });

    const res = await request(app)
      .get('/super-admin/organizations/org-1')
      .set('Authorization', `Bearer ${superAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.organization.id).toBe('org-1');
  });

  it('returns 404 for unknown organization', async () => {
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/super-admin/organizations/unknown')
      .set('Authorization', `Bearer ${superAdminToken()}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /super-admin/organizations/:id/status', () => {
  it('updates org active status and returns 200', async () => {
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg());
    (prisma.organization.update as jest.Mock).mockResolvedValue(mockOrg({ isActive: false }));

    const res = await request(app)
      .patch('/super-admin/organizations/org-1/status')
      .set('Authorization', `Bearer ${superAdminToken()}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
  });
});

describe('POST /super-admin/organizations/:id/promote', () => {
  const stripeConnect = require('../../src/services/stripeConnectService').default;

  beforeEach(() => {
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg({ sandboxMode: true }));
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ email: 'admin@test.com' });
    (prisma.organization.update as jest.Mock).mockResolvedValue(mockOrg({ sandboxMode: false }));
  });

  it('returns 200 with connectOnboardingUrl for a sandbox org', async () => {
    const res = await request(app)
      .post('/super-admin/organizations/org-1/promote')
      .set('Authorization', `Bearer ${superAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.connectOnboardingUrl).toBe('https://connect.stripe.com/onboard/live');
  });

  it('creates a live Connect account (sandboxMode=false)', async () => {
    await request(app)
      .post('/super-admin/organizations/org-1/promote')
      .set('Authorization', `Bearer ${superAdminToken()}`);

    expect(stripeConnect.createConnectAccount as jest.Mock).toHaveBeenCalledWith(
      'org-1', 'Test Org', 'admin@test.com', false,
    );
  });

  it('sets sandboxMode=false and clears onboarding complete on the org', async () => {
    await request(app)
      .post('/super-admin/organizations/org-1/promote')
      .set('Authorization', `Bearer ${superAdminToken()}`);

    expect(prisma.organization.update as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'org-1' },
        data: expect.objectContaining({
          sandboxMode: false,
          stripeConnectOnboardingComplete: false,
        }),
      }),
    );
  });

  it('returns 400 if org is already in production', async () => {
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg({ sandboxMode: false }));

    const res = await request(app)
      .post('/super-admin/organizations/org-1/promote')
      .set('Authorization', `Bearer ${superAdminToken()}`);

    expect(res.status).toBe(400);
  });

  it('returns 404 if org not found', async () => {
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/super-admin/organizations/org-1/promote')
      .set('Authorization', `Bearer ${superAdminToken()}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/super-admin/organizations/org-1/promote');
    expect(res.status).toBe(401);
  });
});
