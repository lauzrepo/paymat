import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface CreateEnrollmentData {
  contactId: string;
  programId: string;
  organizationId: string;
  startDate: Date;
}

class EnrollmentService {
  async enroll(data: CreateEnrollmentData) {
    const { contactId, programId, organizationId, startDate } = data;

    // Verify contact and program belong to the organization
    const [contact, program] = await Promise.all([
      prisma.contact.findFirst({ where: { id: contactId, organizationId } }),
      prisma.program.findFirst({ where: { id: programId, organizationId, isActive: true } }),
    ]);

    if (!contact) throw new AppError(404, 'Contact not found');
    if (!program) throw new AppError(404, 'Program not found or inactive');

    // Check capacity
    if (program.capacity !== null) {
      const activeCount = await prisma.enrollment.count({ where: { programId, status: 'active' } });
      if (activeCount >= program.capacity) {
        throw new AppError(400, 'Program is at capacity');
      }
    }

    const existing = await prisma.enrollment.findUnique({
      where: { contactId_programId: { contactId, programId } },
    });

    if (existing) {
      if (existing.status === 'active') throw new AppError(409, 'Contact is already enrolled in this program');
      // Re-activate cancelled enrollment
      return prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: 'active', startDate, endDate: null },
        include: { contact: true, program: true },
      });
    }

    return prisma.enrollment.create({
      data: { contactId, programId, startDate },
      include: { contact: true, program: true },
    });
  }

  async getEnrollments(organizationId: string, page = 1, limit = 20, filters: { status?: string; contactId?: string; programId?: string } = {}) {
    const skip = (page - 1) * limit;

    // We filter through contact for organizationId
    const where = {
      contact: { organizationId },
      ...(filters.status && { status: filters.status }),
      ...(filters.contactId && { contactId: filters.contactId }),
      ...(filters.programId && { programId: filters.programId }),
    };

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          program: { select: { id: true, name: true, price: true, billingFrequency: true } },
        },
      }),
      prisma.enrollment.count({ where }),
    ]);

    return { enrollments, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getEnrollmentById(enrollmentId: string, organizationId: string) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, contact: { organizationId } },
      include: { contact: true, program: true },
    });
    if (!enrollment) throw new AppError(404, 'Enrollment not found');
    return enrollment;
  }

  async unenroll(enrollmentId: string, organizationId: string, endDate?: Date) {
    await this.getEnrollmentById(enrollmentId, organizationId);
    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'cancelled', endDate: endDate ?? new Date() },
      include: { contact: true, program: true },
    });
  }

  async pauseEnrollment(enrollmentId: string, organizationId: string) {
    const enrollment = await this.getEnrollmentById(enrollmentId, organizationId);
    if (enrollment.status !== 'active') throw new AppError(400, 'Only active enrollments can be paused');
    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'paused' },
    });
  }

  async resumeEnrollment(enrollmentId: string, organizationId: string) {
    const enrollment = await this.getEnrollmentById(enrollmentId, organizationId);
    if (enrollment.status !== 'paused') throw new AppError(400, 'Only paused enrollments can be resumed');
    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'active' },
    });
  }
}

export default new EnrollmentService();
