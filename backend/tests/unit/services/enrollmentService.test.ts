import prisma from '../../../src/config/database';
import enrollmentService from '../../../src/services/enrollmentService';
import { AppError } from '../../../src/middleware/errorHandler';

// ─── Helpers ────────────────────────────────────────────────────────────────

const START_DATE = new Date('2026-04-01T00:00:00.000Z');

const BASE_DATA = {
  contactId: 'contact-1',
  programId: 'prog-1',
  organizationId: 'org-1',
  startDate: START_DATE,
};

function makeContact(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contact-1',
    organizationId: 'org-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    ...overrides,
  };
}

function makeProgram(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prog-1',
    organizationId: 'org-1',
    name: 'Soccer Academy',
    price: 100,
    billingFrequency: 'monthly',
    isActive: true,
    capacity: null,
    ...overrides,
  };
}

function makeEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'enroll-1',
    contactId: 'contact-1',
    programId: 'prog-1',
    status: 'active',
    startDate: START_DATE,
    nextBillingDate: START_DATE,
    endDate: null,
    contact: makeContact(),
    program: makeProgram(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EnrollmentService.enroll()', () => {
  describe('creating a new enrollment', () => {
    it('creates an enrollment with status active and nextBillingDate equal to startDate', async () => {
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(makeContact());
      (prisma.program.findFirst as jest.Mock).mockResolvedValue(makeProgram());
      (prisma.enrollment.count as jest.Mock).mockResolvedValue(0);
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);

      const createdEnrollment = makeEnrollment();
      (prisma.enrollment.create as jest.Mock).mockResolvedValue(createdEnrollment);

      const result = await enrollmentService.enroll(BASE_DATA);

      expect(prisma.enrollment.create as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contactId: 'contact-1',
            programId: 'prog-1',
            startDate: START_DATE,
            nextBillingDate: START_DATE,
          }),
        }),
      );
      expect(result.status).toBe('active');
      expect(result.nextBillingDate).toEqual(START_DATE);
    });
  });

  describe('duplicate active enrollment', () => {
    it('throws 409 if the contact already has an active enrollment in the program', async () => {
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(makeContact());
      (prisma.program.findFirst as jest.Mock).mockResolvedValue(makeProgram());
      (prisma.enrollment.count as jest.Mock).mockResolvedValue(0);
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(makeEnrollment({ status: 'active' }));

      await expect(enrollmentService.enroll(BASE_DATA)).rejects.toMatchObject({
        statusCode: 409,
      });
      await expect(enrollmentService.enroll(BASE_DATA)).rejects.toThrow(
        'Contact is already enrolled in this program',
      );
    });
  });

  describe('re-activating a cancelled enrollment', () => {
    it('updates status to active, resets startDate and nextBillingDate, clears endDate', async () => {
      const cancelledEnrollment = makeEnrollment({
        id: 'enroll-old',
        status: 'cancelled',
        endDate: new Date('2026-02-01'),
      });

      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(makeContact());
      (prisma.program.findFirst as jest.Mock).mockResolvedValue(makeProgram());
      (prisma.enrollment.count as jest.Mock).mockResolvedValue(0);
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(cancelledEnrollment);

      const reactivated = makeEnrollment({ id: 'enroll-old', status: 'active', endDate: null });
      (prisma.enrollment.update as jest.Mock).mockResolvedValue(reactivated);

      const result = await enrollmentService.enroll(BASE_DATA);

      expect(prisma.enrollment.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'enroll-old' },
          data: expect.objectContaining({
            status: 'active',
            startDate: START_DATE,
            nextBillingDate: START_DATE,
            endDate: null,
          }),
        }),
      );
      expect(result.status).toBe('active');
      expect(result.endDate).toBeNull();
      expect(prisma.enrollment.create as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('validation errors', () => {
    it('throws 404 if contact is not found in the organization', async () => {
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.program.findFirst as jest.Mock).mockResolvedValue(makeProgram());

      await expect(enrollmentService.enroll(BASE_DATA)).rejects.toMatchObject({ statusCode: 404 });
      await expect(enrollmentService.enroll(BASE_DATA)).rejects.toThrow('Contact not found');
    });

    it('throws 404 if program is not found or is inactive', async () => {
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(makeContact());
      (prisma.program.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(enrollmentService.enroll(BASE_DATA)).rejects.toMatchObject({ statusCode: 404 });
      await expect(enrollmentService.enroll(BASE_DATA)).rejects.toThrow('Program not found or inactive');
    });

    it('throws 400 if program is at capacity', async () => {
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(makeContact());
      (prisma.program.findFirst as jest.Mock).mockResolvedValue(makeProgram({ capacity: 10 }));
      // Active count equals capacity
      (prisma.enrollment.count as jest.Mock).mockResolvedValue(10);

      await expect(enrollmentService.enroll(BASE_DATA)).rejects.toMatchObject({ statusCode: 400 });
      await expect(enrollmentService.enroll(BASE_DATA)).rejects.toThrow('Program is at capacity');
    });

    it('does not check capacity when program.capacity is null', async () => {
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(makeContact());
      (prisma.program.findFirst as jest.Mock).mockResolvedValue(makeProgram({ capacity: null }));
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.enrollment.create as jest.Mock).mockResolvedValue(makeEnrollment());

      await expect(enrollmentService.enroll(BASE_DATA)).resolves.toBeDefined();
      expect(prisma.enrollment.count as jest.Mock).not.toHaveBeenCalled();
    });
  });
});

describe('EnrollmentService.unenroll()', () => {
  it('sets status to cancelled and records endDate', async () => {
    const enrollment = makeEnrollment();
    // getEnrollmentById calls findFirst
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(enrollment);

    const endDate = new Date('2026-04-15T00:00:00.000Z');
    const cancelled = makeEnrollment({ status: 'cancelled', endDate });
    (prisma.enrollment.update as jest.Mock).mockResolvedValue(cancelled);

    const result = await enrollmentService.unenroll('enroll-1', 'org-1', endDate);

    expect(prisma.enrollment.update as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'enroll-1' },
        data: expect.objectContaining({ status: 'cancelled', endDate }),
      }),
    );
    expect(result.status).toBe('cancelled');
  });

  it('uses current date as endDate when none is provided', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(makeEnrollment());
    (prisma.enrollment.update as jest.Mock).mockResolvedValue(makeEnrollment({ status: 'cancelled' }));

    const before = new Date();
    await enrollmentService.unenroll('enroll-1', 'org-1');
    const after = new Date();

    const updateCall = (prisma.enrollment.update as jest.Mock).mock.calls[0][0];
    const usedDate: Date = updateCall.data.endDate;

    expect(usedDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(usedDate.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('throws 404 when enrollment does not exist', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(enrollmentService.unenroll('bad-id', 'org-1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('EnrollmentService.pauseEnrollment()', () => {
  it('sets status to paused when enrollment is active', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(makeEnrollment({ status: 'active' }));
    const paused = makeEnrollment({ status: 'paused' });
    (prisma.enrollment.update as jest.Mock).mockResolvedValue(paused);

    const result = await enrollmentService.pauseEnrollment('enroll-1', 'org-1');

    expect(prisma.enrollment.update as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'enroll-1' },
        data: { status: 'paused' },
      }),
    );
    expect(result.status).toBe('paused');
  });

  it('throws 400 if enrollment is not active', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(makeEnrollment({ status: 'paused' }));

    await expect(enrollmentService.pauseEnrollment('enroll-1', 'org-1')).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(enrollmentService.pauseEnrollment('enroll-1', 'org-1')).rejects.toThrow(
      'Only active enrollments can be paused',
    );
  });

  it('throws 400 if enrollment is cancelled', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(makeEnrollment({ status: 'cancelled' }));

    await expect(enrollmentService.pauseEnrollment('enroll-1', 'org-1')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('EnrollmentService.resumeEnrollment()', () => {
  it('sets status to active when enrollment is paused', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(makeEnrollment({ status: 'paused' }));
    const resumed = makeEnrollment({ status: 'active' });
    (prisma.enrollment.update as jest.Mock).mockResolvedValue(resumed);

    const result = await enrollmentService.resumeEnrollment('enroll-1', 'org-1');

    expect(prisma.enrollment.update as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'enroll-1' },
        data: { status: 'active' },
      }),
    );
    expect(result.status).toBe('active');
  });

  it('throws 400 if enrollment is not paused', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(makeEnrollment({ status: 'active' }));

    await expect(enrollmentService.resumeEnrollment('enroll-1', 'org-1')).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(enrollmentService.resumeEnrollment('enroll-1', 'org-1')).rejects.toThrow(
      'Only paused enrollments can be resumed',
    );
  });

  it('throws 400 if enrollment is cancelled', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(makeEnrollment({ status: 'cancelled' }));

    await expect(enrollmentService.resumeEnrollment('enroll-1', 'org-1')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('EnrollmentService.getEnrollments()', () => {
  it('filters by organizationId through the contact relation', async () => {
    const enrollments = [makeEnrollment()];
    (prisma.enrollment.findMany as jest.Mock).mockResolvedValue(enrollments);
    (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);

    const result = await enrollmentService.getEnrollments('org-1');

    expect(prisma.enrollment.findMany as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contact: { organizationId: 'org-1' },
        }),
      }),
    );
    expect(result.enrollments).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('applies optional status filter', async () => {
    (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.enrollment.count as jest.Mock).mockResolvedValue(0);

    await enrollmentService.getEnrollments('org-1', 1, 20, { status: 'paused' });

    expect(prisma.enrollment.findMany as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'paused' }),
      }),
    );
  });

  it('applies optional contactId filter', async () => {
    (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.enrollment.count as jest.Mock).mockResolvedValue(0);

    await enrollmentService.getEnrollments('org-1', 1, 20, { contactId: 'contact-42' });

    expect(prisma.enrollment.findMany as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ contactId: 'contact-42' }),
      }),
    );
  });

  it('applies optional programId filter', async () => {
    (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.enrollment.count as jest.Mock).mockResolvedValue(0);

    await enrollmentService.getEnrollments('org-1', 1, 20, { programId: 'prog-99' });

    expect(prisma.enrollment.findMany as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ programId: 'prog-99' }),
      }),
    );
  });

  it('returns correct pagination metadata', async () => {
    (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([makeEnrollment()]);
    (prisma.enrollment.count as jest.Mock).mockResolvedValue(45);

    const result = await enrollmentService.getEnrollments('org-1', 2, 20);

    expect(result.page).toBe(2);
    expect(result.total).toBe(45);
    expect(result.totalPages).toBe(3);
  });

  it('passes correct skip value based on page and limit', async () => {
    (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.enrollment.count as jest.Mock).mockResolvedValue(0);

    await enrollmentService.getEnrollments('org-1', 3, 10);

    expect(prisma.enrollment.findMany as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });
});

describe('EnrollmentService.getEnrollmentById()', () => {
  it('returns the enrollment when found', async () => {
    const enrollment = makeEnrollment();
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(enrollment);

    const result = await enrollmentService.getEnrollmentById('enroll-1', 'org-1');

    expect(prisma.enrollment.findFirst as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'enroll-1', contact: { organizationId: 'org-1' } },
      }),
    );
    expect(result.id).toBe('enroll-1');
  });

  it('throws 404 when enrollment is not found', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      enrollmentService.getEnrollmentById('missing-id', 'org-1'),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      enrollmentService.getEnrollmentById('missing-id', 'org-1'),
    ).rejects.toThrow('Enrollment not found');
  });
});
