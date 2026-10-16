import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/server';
import prisma from '../../src/config/database';

jest.mock('../../src/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn(),
  sendWelcomeEmail: jest.fn(),
  sendInvoiceGenerated: jest.fn(),
  sendPaymentReceived: jest.fn(),
  sendPaymentFailed: jest.fn(),
}));

const baseOrg = {
  id: 'org-1',
  name: 'Test Org',
  slug: 'test-org',
  isActive: true,
  industry: null as string | null,
  classBookingEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';

const tokenFor = (role: string) =>
  jwt.sign({ userId: 'user-1', email: 't@test.com', organizationId: 'org-1', role }, JWT_SECRET, { expiresIn: '1h' });

const get = (path: string, role = 'admin') =>
  request(app).get(path).set('x-organization-slug', 'test-org').set('Authorization', `Bearer ${tokenFor(role)}`);

const post = (path: string, body: unknown, role = 'admin') =>
  request(app)
    .post(path)
    .set('x-organization-slug', 'test-org')
    .set('Authorization', `Bearer ${tokenFor(role)}`)
    .send(body as object);

const setOrg = (overrides: Record<string, unknown> = {}) =>
  (prisma.organization.findFirst as jest.Mock).mockResolvedValue({ ...baseOrg, ...overrides });

beforeEach(() => {
  setOrg();
  (prisma.program.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.program.create as jest.Mock).mockImplementation(({ data }) =>
    Promise.resolve({ id: `prog-${data.name}`, ...data })
  );
  (prisma.organization.update as jest.Mock).mockResolvedValue({});
  (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
});

describe('GET /api/programs/templates', () => {
  it('returns every industry when the org has none set', async () => {
    const res = await get('/api/programs/templates');

    expect(res.status).toBe(200);
    expect(res.body.data.industry).toBeNull();
    expect(res.body.data.templates.length).toBeGreaterThan(1);
  });

  it("returns only the org's own industry when set", async () => {
    setOrg({ industry: 'swim' });

    const res = await get('/api/programs/templates');

    expect(res.status).toBe(200);
    expect(res.body.data.industry).toBe('swim');
    expect(res.body.data.templates).toHaveLength(1);
    expect(res.body.data.templates[0].industry).toBe('swim');
  });

  it.each(['staff', 'client'])('rejects the %s role with 403', async (role) => {
    const res = await get('/api/programs/templates', role);
    expect(res.status).toBe(403);
  });

  it('is not shadowed by the /:id route', async () => {
    const res = await get('/api/programs/templates');
    expect(res.body.data.templates).toBeDefined();
    expect(prisma.program.findFirst).not.toHaveBeenCalled();
  });
});

describe('POST /api/programs/templates/apply', () => {
  it('creates inactive, non-self-enrollable programs scoped to the org', async () => {
    const res = await post('/api/programs/templates/apply', {
      industry: 'dance',
      programs: [{ key: 'weekly_1hr' }, { key: 'registration' }],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.created).toHaveLength(2);
    expect(res.body.data.skipped).toEqual([]);

    for (const [{ data }] of (prisma.program.create as jest.Mock).mock.calls) {
      expect(data).toMatchObject({ organizationId: 'org-1', isActive: false, allowSelfEnrollment: false });
    }
  });

  it('defaults price to the suggested price and honours overrides', async () => {
    const res = await post('/api/programs/templates/apply', {
      industry: 'dance',
      programs: [
        { key: 'weekly_1hr' },
        { key: 'registration', price: 55, name: 'Studio registration', description: 'Annual' },
      ],
    });

    expect(res.status).toBe(201);
    const [first, second] = (prisma.program.create as jest.Mock).mock.calls.map((c) => c[0].data);
    expect(Number(first.price)).toBe(75);
    expect(Number(second.price)).toBe(55);
    expect(second.name).toBe('Studio registration');
    expect(second.description).toBe('Annual');
  });

  it('skips programs whose name already exists (case-insensitive) and reports them', async () => {
    (prisma.program.findMany as jest.Mock).mockResolvedValue([{ name: 'REGISTRATION FEE' }]);

    const res = await post('/api/programs/templates/apply', {
      industry: 'dance',
      programs: [{ key: 'weekly_1hr' }, { key: 'registration' }],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.created).toHaveLength(1);
    expect(res.body.data.skipped).toEqual([{ key: 'registration', name: 'Registration fee', reason: 'already_exists' }]);
  });

  it('drops maxClasses and flags it when Class Booking is off', async () => {
    const res = await post('/api/programs/templates/apply', {
      industry: 'personal_training',
      programs: [{ key: 'pack_12_one_on_one' }],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.classBookingOff).toBe(true);
    expect((prisma.program.create as jest.Mock).mock.calls[0][0].data.maxClasses).toBeUndefined();
  });

  it('keeps maxClasses when Class Booking is on', async () => {
    setOrg({ classBookingEnabled: true });

    const res = await post('/api/programs/templates/apply', {
      industry: 'personal_training',
      programs: [{ key: 'pack_12_one_on_one' }],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.classBookingOff).toBe(false);
    expect((prisma.program.create as jest.Mock).mock.calls[0][0].data.maxClasses).toBe(12);
  });

  it('sets the org industry only when it was unset', async () => {
    await post('/api/programs/templates/apply', { industry: 'dance', programs: [{ key: 'weekly_1hr' }] });
    expect(prisma.organization.update).toHaveBeenCalledWith({ where: { id: 'org-1' }, data: { industry: 'dance' } });

    (prisma.organization.update as jest.Mock).mockClear();
    setOrg({ industry: 'music' });

    await post('/api/programs/templates/apply', { industry: 'dance', programs: [{ key: 'weekly_1hr' }] });
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });

  it('writes an audit log entry', async () => {
    await post('/api/programs/templates/apply', { industry: 'dance', programs: [{ key: 'weekly_1hr' }] });

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    const { data } = (prisma.auditLog.create as jest.Mock).mock.calls[0][0];
    expect(data).toMatchObject({
      organizationId: 'org-1',
      userId: 'user-1',
      action: 'PROGRAM_TEMPLATE_APPLIED',
    });
    expect(data.metadata.industry).toBe('dance');
    expect(data.metadata.programIds).toHaveLength(1);
  });

  it.each([
    ['missing industry', { programs: [{ key: 'weekly_1hr' }] }],
    ['unknown industry', { industry: 'plumbing', programs: [{ key: 'weekly_1hr' }] }],
    ['missing programs', { industry: 'dance' }],
    ['empty programs', { industry: 'dance', programs: [] }],
    ['unknown key', { industry: 'dance', programs: [{ key: 'nope' }] }],
    ['key from another industry', { industry: 'dance', programs: [{ key: 'team_track' }] }],
    ['duplicate key', { industry: 'dance', programs: [{ key: 'weekly_1hr' }, { key: 'weekly_1hr' }] }],
    ['zero price', { industry: 'dance', programs: [{ key: 'weekly_1hr', price: 0 }] }],
    ['negative price', { industry: 'dance', programs: [{ key: 'weekly_1hr', price: -5 }] }],
    ['string price', { industry: 'dance', programs: [{ key: 'weekly_1hr', price: '50' }] }],
    ['blank name', { industry: 'dance', programs: [{ key: 'weekly_1hr', name: '  ' }] }],
  ])('returns 400 for %s and creates nothing', async (_label, body) => {
    const res = await post('/api/programs/templates/apply', body);

    expect(res.status).toBe(400);
    expect(prisma.program.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it.each(['staff', 'client'])('rejects the %s role with 403', async (role) => {
    const res = await post('/api/programs/templates/apply', { industry: 'dance', programs: [{ key: 'weekly_1hr' }] }, role);

    expect(res.status).toBe(403);
    expect(prisma.program.create).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/programs/templates/apply')
      .set('x-organization-slug', 'test-org')
      .send({});

    expect(res.status).toBe(401);
  });
});
