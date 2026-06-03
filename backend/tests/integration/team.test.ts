import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/server';
import prisma from '../../src/config/database';

jest.mock('../../src/services/emailService', () => ({
  sendStaffInvite: jest.fn().mockResolvedValue(undefined),
  sendMemberPortalInvite: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedpw'),
  compare: jest.fn().mockResolvedValue(true),
}));

const SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
const ORG = { id: 'org-1', name: 'Test Org', slug: 'test-org', isActive: true };

const ADMIN_USER = {
  id: 'user-admin', email: 'admin@test.com', organizationId: 'org-1', role: 'admin',
  firstName: 'Admin', lastName: 'User', passwordHash: 'hashedpw',
  deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
  contactId: null, passwordResetToken: null, passwordResetExpiry: null,
};

const STAFF_USER = {
  id: 'user-staff', email: 'staff@test.com', organizationId: 'org-1', role: 'staff',
  firstName: 'Staff', lastName: 'Member', passwordHash: 'hashedpw',
  deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
  contactId: null, passwordResetToken: null, passwordResetExpiry: null,
};

function makeToken(userId = 'user-admin', role = 'admin') {
  return jwt.sign(
    { userId, email: `${userId}@test.com`, organizationId: 'org-1', role },
    SECRET,
    { expiresIn: '1h' }
  );
}

const pendingInvite = (overrides = {}) => ({
  id: 'invite-1', email: 'newstaff@test.com', token: 'tok-abc',
  organizationId: 'org-1', invitedBy: 'user-admin',
  usedAt: null, createdAt: new Date(),
  organization: { name: 'Test Org' },
  ...overrides,
});

beforeEach(() => {
  (prisma.organization.findFirst as jest.Mock).mockResolvedValue(ORG);
  (prisma.organization.findUnique as jest.Mock).mockResolvedValue(ORG);
  (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
});

// ── GET /api/team ─────────────────────────────────────────────────────────────

describe('GET /api/team', () => {
  it('returns 200 with members and pendingInvites for admin', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([ADMIN_USER, STAFF_USER]);
    (prisma.staffInvite.findMany as jest.Mock).mockResolvedValue([pendingInvite()]);

    const res = await request(app)
      .get('/api/team')
      .set('Authorization', `Bearer ${makeToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(res.body.data.members).toHaveLength(2);
    expect(res.body.data.pendingInvites).toHaveLength(1);
  });

  it('returns 403 for staff role', async () => {
    const res = await request(app)
      .get('/api/team')
      .set('Authorization', `Bearer ${makeToken('user-staff', 'staff')}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/team').set('x-organization-slug', 'test-org');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/team/invite ─────────────────────────────────────────────────────

describe('POST /api/team/invite', () => {
  it('returns 201 and creates the invite for admin', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null); // no existing user
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(ADMIN_USER);
    (prisma.staffInvite.create as jest.Mock).mockResolvedValue(pendingInvite());

    const res = await request(app)
      .post('/api/team/invite')
      .set('Authorization', `Bearer ${makeToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ email: 'newstaff@test.com' });

    expect(res.status).toBe(201);
    expect(res.body.data.invite.email).toBe('newstaff@test.com');
  });

  it('returns 409 when a user with that email already exists', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(STAFF_USER);

    const res = await request(app)
      .post('/api/team/invite')
      .set('Authorization', `Bearer ${makeToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({ email: 'staff@test.com' });

    expect(res.status).toBe(409);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/team/invite')
      .set('Authorization', `Bearer ${makeToken()}`)
      .set('x-organization-slug', 'test-org')
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 403 for staff role', async () => {
    const res = await request(app)
      .post('/api/team/invite')
      .set('Authorization', `Bearer ${makeToken('user-staff', 'staff')}`)
      .set('x-organization-slug', 'test-org')
      .send({ email: 'x@test.com' });

    expect(res.status).toBe(403);
  });
});

// ── POST /api/team/invite/:id/resend ─────────────────────────────────────────

describe('POST /api/team/invite/:id/resend', () => {
  it('returns 200 and resends the email', async () => {
    (prisma.staffInvite.findFirst as jest.Mock).mockResolvedValue(pendingInvite());
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(ADMIN_USER);

    const res = await request(app)
      .post('/api/team/invite/invite-1/resend')
      .set('Authorization', `Bearer ${makeToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
  });

  it('returns 404 for an unknown or used invite', async () => {
    (prisma.staffInvite.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/team/invite/bad-id/resend')
      .set('Authorization', `Bearer ${makeToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/team/invite/:id ───────────────────────────────────────────────

describe('DELETE /api/team/invite/:id', () => {
  it('returns 200 and deletes the pending invite', async () => {
    (prisma.staffInvite.findFirst as jest.Mock).mockResolvedValue(pendingInvite());
    (prisma.staffInvite.delete as jest.Mock).mockResolvedValue(pendingInvite());

    const res = await request(app)
      .delete('/api/team/invite/invite-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(prisma.staffInvite.delete).toHaveBeenCalledWith({ where: { id: 'invite-1' } });
  });

  it('returns 404 for an unknown invite', async () => {
    (prisma.staffInvite.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/team/invite/bad-id')
      .set('Authorization', `Bearer ${makeToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/team/:userId ──────────────────────────────────────────────────

describe('DELETE /api/team/:userId', () => {
  it('returns 200 and soft-deletes the team member', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(STAFF_USER);
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...STAFF_USER, deletedAt: new Date() });

    const res = await request(app)
      .delete('/api/team/user-staff')
      .set('Authorization', `Bearer ${makeToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-staff' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('returns 400 when admin tries to remove themselves', async () => {
    const res = await request(app)
      .delete('/api/team/user-admin')
      .set('Authorization', `Bearer ${makeToken('user-admin', 'admin')}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(400);
  });

  it('returns 404 when user not found in org', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/team/user-unknown')
      .set('Authorization', `Bearer ${makeToken()}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(404);
  });

  it('returns 403 for staff role', async () => {
    const res = await request(app)
      .delete('/api/team/user-admin')
      .set('Authorization', `Bearer ${makeToken('user-staff', 'staff')}`)
      .set('x-organization-slug', 'test-org');

    expect(res.status).toBe(403);
  });
});

// ── GET /api/team/invite/:token (public) ─────────────────────────────────────

describe('GET /api/team/invite/:token', () => {
  it('returns 200 with email and orgName for a valid token', async () => {
    (prisma.staffInvite.findUnique as jest.Mock).mockResolvedValue(pendingInvite());

    const res = await request(app).get('/api/team/invite/tok-abc');

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('newstaff@test.com');
    expect(res.body.data.orgName).toBe('Test Org');
  });

  it('returns 404 for an unknown token', async () => {
    (prisma.staffInvite.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/team/invite/bad-token');

    expect(res.status).toBe(404);
  });

  it('returns 410 for an already-used invite', async () => {
    (prisma.staffInvite.findUnique as jest.Mock).mockResolvedValue(pendingInvite({ usedAt: new Date() }));

    const res = await request(app).get('/api/team/invite/tok-abc');

    expect(res.status).toBe(410);
  });
});

// ── POST /api/team/invite/:token/accept (public) ─────────────────────────────

describe('POST /api/team/invite/:token/accept', () => {
  const validBody = { firstName: 'New', lastName: 'Staff', password: 'securepassword' };

  it('returns 201 and creates a staff user on valid invite', async () => {
    (prisma.staffInvite.findUnique as jest.Mock).mockResolvedValue(pendingInvite());
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.$transaction as jest.Mock).mockImplementation((ops: any[]) => Promise.all(ops));
    (prisma.user.create as jest.Mock).mockResolvedValue({ ...STAFF_USER, email: 'newstaff@test.com' });
    (prisma.staffInvite.update as jest.Mock).mockResolvedValue({ ...pendingInvite(), usedAt: new Date() });

    const res = await request(app)
      .post('/api/team/invite/tok-abc/accept')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/team/invite/tok-abc/accept')
      .send({ firstName: 'New' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown token', async () => {
    (prisma.staffInvite.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/team/invite/bad-token/accept')
      .send(validBody);

    expect(res.status).toBe(404);
  });

  it('returns 410 for an already-used invite', async () => {
    (prisma.staffInvite.findUnique as jest.Mock).mockResolvedValue(pendingInvite({ usedAt: new Date() }));

    const res = await request(app)
      .post('/api/team/invite/tok-abc/accept')
      .send(validBody);

    expect(res.status).toBe(410);
  });

  it('returns 409 when an account for that email already exists', async () => {
    (prisma.staffInvite.findUnique as jest.Mock).mockResolvedValue(pendingInvite());
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(STAFF_USER);

    const res = await request(app)
      .post('/api/team/invite/tok-abc/accept')
      .send(validBody);

    expect(res.status).toBe(409);
  });
});
