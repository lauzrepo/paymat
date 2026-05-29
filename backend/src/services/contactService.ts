import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { sendMemberPortalInvite } from './emailService';
import { config } from '../config/environment';
import logger from '../utils/logger';

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

export interface BulkImportContactRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  notes?: string;
}

class ContactService {
  async createContact(data: CreateContactData) {
    const contact = await prisma.contact.create({
      data,
      include: { family: true, enrollments: { include: { program: true } } },
    });

    if (contact.email) {
      const org = await prisma.organization.findUnique({ where: { id: contact.organizationId }, select: { name: true, slug: true } });
      if (org) {
        prisma.memberPortalInvite.create({
          data: { contactId: contact.id, email: contact.email },
        }).then((invite) =>
          sendMemberPortalInvite(contact.email!, {
            firstName: contact.firstName,
            orgName: org.name,
            orgSlug: org.slug,
            token: invite.token,
            baseDomain: config.multiTenant.baseDomain,
          })
        ).catch((err) => logger.warn('[MemberInvite] Failed to send portal invite', { err, contactId: contact.id }));
      }
    }

    return contact;
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
    // Cancel all active/paused enrollments to stop future billing
    await prisma.enrollment.updateMany({
      where: { contactId, status: { in: ['active', 'paused'] } },
      data: { status: 'cancelled', endDate: new Date(), nextBillingDate: null },
    });
    return prisma.contact.update({
      where: { id: contactId },
      data: { status: 'inactive' },
    });
  }

  async reactivateContact(contactId: string, organizationId: string) {
    await this.getContactById(contactId, organizationId);
    return prisma.contact.update({
      where: { id: contactId },
      data: { status: 'active' },
    });
  }

  async bulkImportContacts(organizationId: string, rows: BulkImportContactRow[]) {
    const created: object[] = [];
    const errors: { row: number; data: BulkImportContactRow; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.firstName?.trim()) throw new Error('firstName is required');
        if (!row.lastName?.trim()) throw new Error('lastName is required');
        const contact = await this.createContact({
          organizationId,
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          email: row.email?.trim() || undefined,
          phone: row.phone?.trim() || undefined,
          dateOfBirth: row.dateOfBirth?.trim() ? new Date(row.dateOfBirth.trim()) : undefined,
          notes: row.notes?.trim() || undefined,
        });
        created.push(contact);
      } catch (err) {
        errors.push({ row: i + 2, data: row, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return { created, errors };
  }

  async deleteContact(contactId: string, organizationId: string) {
    const contact = await this.getContactById(contactId, organizationId);
    const [invoiceCount, paymentCount] = await Promise.all([
      prisma.invoice.count({ where: { contactId } }),
      prisma.payment.count({ where: { organizationId, invoiceId: { in: (await prisma.invoice.findMany({ where: { contactId }, select: { id: true } })).map((i) => i.id) } } }),
    ]);
    if (invoiceCount > 0 || paymentCount > 0) {
      throw new AppError(400, 'Cannot delete a contact with invoices or payments. Deactivate instead.');
    }
    // Cancel enrollments first
    await prisma.enrollment.deleteMany({ where: { contactId } });
    await prisma.contact.delete({ where: { id: contactId } });
    return contact;
  }
}

export default new ContactService();
