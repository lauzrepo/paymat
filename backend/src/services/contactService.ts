import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface CreateContactData {
  organizationId: string;
  familyId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  notes?: string;
}

export interface UpdateContactData {
  familyId?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date | null;
  notes?: string;
  status?: string;
  helcimToken?: string;
}

class ContactService {
  async createContact(data: CreateContactData) {
    return prisma.contact.create({
      data,
      include: { family: true, enrollments: { include: { program: true } } },
    });
  }

  async getContacts(organizationId: string, page = 1, limit = 20, filters: { status?: string; familyId?: string; search?: string } = {}) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {
      organizationId,
      ...(filters.status && { status: filters.status }),
      ...(filters.familyId && { familyId: filters.familyId }),
      ...(filters.search && {
        OR: [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          family: true,
          enrollments: { where: { status: 'active' }, include: { program: true } },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return { contacts, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getContactById(contactId: string, organizationId: string) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      include: {
        family: true,
        enrollments: { include: { program: true } },
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!contact) throw new AppError(404, 'Contact not found');
    return contact;
  }

  async updateContact(contactId: string, organizationId: string, data: UpdateContactData) {
    await this.getContactById(contactId, organizationId);
    return prisma.contact.update({
      where: { id: contactId },
      data,
      include: { family: true, enrollments: { include: { program: true } } },
    });
  }

  async deactivateContact(contactId: string, organizationId: string) {
    await this.getContactById(contactId, organizationId);
    return prisma.contact.update({
      where: { id: contactId },
      data: { status: 'inactive' },
    });
  }
}

export default new ContactService();
