import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/server';
import prisma from '../../src/config/database';

// Bypass rate limiters in tests
jest.mock('../../src/middleware/rateLimiter', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  authLimiter: (_req: any, _res: any, next: any) => next(),
  paymentLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedpw'),
  compare: jest.fn().mockResolvedValue(true),
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

const TEST_USER = {
  id: 'user-1',
  email: 'test@test.com',
  organizationId: 'org-1',
  passwordHash: 'hashedpw',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  passwordResetToken: null,
  passwordResetExpiry: null,
  contactId: null,
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
  // Default: tenant resolution succeeds
  (prisma.organization.findFirst as jest.Mock).mockResolvedValue(TEST_ORG);
  // Default: auditLog writes succeed silently
  (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
});

describe('POST /api/auth/login', () => {
  it('returns 200 with accessToken and refreshToken on valid credentials', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(TEST_USER);

    const res = await request(app)
      .post('/api/auth/login')
      .set('x-organization-slug', 'test-org')
      .send({ email: 'test@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user).toMatchObject({
      id: 'user-1',
      email: 'test@test.com',
      role: 'admin',
    });
  });

  it('returns 401 when password is wrong', async () => {
    const bcrypt = require('bcrypt');
    bcrypt.compare.mockResolvedValueOnce(false);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(TEST_USER);

    const res = await request(app)
      .post('/api/auth/login')
      .set('x-organization-slug', 'test-org')
      .send({ email: 'test@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
  });

  it('returns 401 when email does not exist', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .set('x-organization-slug', 'test-org')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
  });

  it('returns 404 when organization slug is unknown', async () => {
    (prisma.organization.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/auth/login')
      .set('x-organization-slug', 'does-not-exist')
      .send({ email: 'test@test.com', password: 'password123' });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 200 with user data when authenticated', async () => {
    const userResponse = {
      id: 'user-1',
      email: 'test@test.com',
      organizationId: 'org-1',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      createdAt: new Date(),
    };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userResponse);

    const token = makeToken();

    const res = await request(app)
      .get('/api/auth/me')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user).toMatchObject({
      id: 'user-1',
      email: 'test@test.com',
    });
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', 'Bearer not.a.real.token');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 when authenticated', async () => {
    const token = makeToken();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('x-organization-slug', 'test-org')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toMatch(/logged out/i);
  });

  it('returns 200 even without an auth token (logout is public)', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('returns 200 for a known email', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(TEST_USER);
    (prisma.user.update as jest.Mock).mockResolvedValue(TEST_USER);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .set('x-organization-slug', 'test-org')
      .send({ email: 'test@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toMatch(/password reset link/i);
  });

  it('returns 200 even for an unknown email (no enumeration)', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .set('x-organization-slug', 'test-org')
      .send({ email: 'nobody@unknown.com' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toMatch(/password reset link/i);
  });

  it('returns 400 for an invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .set('x-organization-slug', 'test-org')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
  });
});
