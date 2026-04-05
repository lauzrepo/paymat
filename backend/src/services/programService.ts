import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface CreateProgramData {
  organizationId: string;
  name: string;
  description?: string;
  price: number;
  billingFrequency: string;
  capacity?: number;
}

class ProgramService {
  async createProgram(data: CreateProgramData) {
    return prisma.program.create({
      data: {
        ...data,
        price: new Decimal(data.price),
      },
    });
  }

  async getPrograms(organizationId: string, page = 1, limit = 20, activeOnly = false) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      ...(activeOnly && { isActive: true }),
    };

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { enrollments: { where: { status: 'active' } } } },
        },
      }),
      prisma.program.count({ where }),
    ]);

    return { programs, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getProgramById(programId: string, organizationId: string) {
    const program = await prisma.program.findFirst({
      where: { id: programId, organizationId },
      include: {
        enrollments: {
          where: { status: 'active' },
          include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        _count: { select: { enrollments: { where: { status: 'active' } } } },
      },
    });
    if (!program) throw new AppError(404, 'Program not found');
    return program;
  }

  async updateProgram(programId: string, organizationId: string, data: { name?: string; description?: string; price?: number; billingFrequency?: string; capacity?: number; isActive?: boolean }) {
    await this.getProgramById(programId, organizationId);
    return prisma.program.update({
      where: { id: programId },
      data: {
        ...data,
        ...(data.price !== undefined && { price: new Decimal(data.price) }),
      },
    });
  }
}

export default new ProgramService();
