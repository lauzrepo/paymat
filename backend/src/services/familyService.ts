import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface CreateFamilyData {
  organizationId: string;
  name: string;
  billingEmail?: string;
}

class FamilyService {
  async createFamily(data: CreateFamilyData) {
    return prisma.family.create({
      data,
      include: { contacts: true },
    });
  }

  async getFamilies(organizationId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { organizationId };

    const [families, total] = await Promise.all([
      prisma.family.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { contacts: { where: { status: 'active' } } },
      }),
      prisma.family.count({ where }),
    ]);

    return { families, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getFamilyById(familyId: string, organizationId: string) {
    const family = await prisma.family.findFirst({
      where: { id: familyId, organizationId },
      include: {
        contacts: {
          include: { enrollments: { where: { status: 'active' }, include: { program: true } } },
        },
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!family) throw new AppError(404, 'Family not found');
    return family;
  }

  async updateFamily(familyId: string, organizationId: string, data: { name?: string; billingEmail?: string }) {
    await this.getFamilyById(familyId, organizationId);
    return prisma.family.update({
      where: { id: familyId },
      data,
      include: { contacts: true },
    });
  }

  async deleteFamily(familyId: string, organizationId: string) {
    const family = await this.getFamilyById(familyId, organizationId);
    if (family.contacts.length > 0) {
      throw new AppError(400, 'Cannot delete a family with contacts. Remove contacts first.');
    }
    await prisma.family.delete({ where: { id: familyId } });
  }
}

export default new FamilyService();
