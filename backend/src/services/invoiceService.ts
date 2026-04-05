import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export interface CreateInvoiceData {
  organizationId: string;
  contactId?: string;
  familyId?: string;
  dueDate: Date;
  notes?: string;
  lineItems: {
    enrollmentId?: string;
    description: string;
    quantity?: number;
    unitPrice: number;
  }[];
}

class InvoiceService {
  async createInvoice(data: CreateInvoiceData) {
    const { organizationId, contactId, familyId, dueDate, notes, lineItems } = data;

    if (!contactId && !familyId) {
      throw new AppError(400, 'Invoice must be assigned to a contact or family');
    }

    const amountDue = lineItems.reduce((sum, item) => {
      const qty = item.quantity ?? 1;
      return sum + item.unitPrice * qty;
    }, 0);

    const count = await prisma.invoice.count({ where: { organizationId } });
    const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        contactId,
        familyId,
        invoiceNumber,
        amountDue: new Decimal(amountDue),
        dueDate,
        notes,
        lineItems: {
          create: lineItems.map((item) => ({
            enrollmentId: item.enrollmentId,
            description: item.description,
            quantity: item.quantity ?? 1,
            unitPrice: new Decimal(item.unitPrice),
            total: new Decimal(item.unitPrice * (item.quantity ?? 1)),
          })),
        },
      },
      include: { lineItems: true, contact: true, family: true },
    });

    logger.info(`Invoice created: ${invoice.invoiceNumber}`);
    return invoice;
  }

  async getInvoices(organizationId: string, page = 1, limit = 20, filters: { status?: string; contactId?: string; familyId?: string } = {}) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      ...(filters.status && { status: filters.status }),
      ...(filters.contactId && { contactId: filters.contactId }),
      ...(filters.familyId && { familyId: filters.familyId }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { lineItems: true, contact: true, family: true, payments: true },
      }),
      prisma.invoice.count({ where }),
    ]);

    return { invoices, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getInvoiceById(invoiceId: string, organizationId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { lineItems: true, contact: true, family: true, payments: true },
    });
    if (!invoice) throw new AppError(404, 'Invoice not found');
    return invoice;
  }

  async markAsPaid(invoiceId: string, organizationId: string) {
    const invoice = await this.getInvoiceById(invoiceId, organizationId);
    if (invoice.status === 'paid') throw new AppError(400, 'Invoice is already paid');

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        amountPaid: invoice.amountDue,
        paidAt: new Date(),
      },
      include: { lineItems: true },
    });
  }

  async voidInvoice(invoiceId: string, organizationId: string) {
    const invoice = await this.getInvoiceById(invoiceId, organizationId);
    if (invoice.status === 'paid') throw new AppError(400, 'Cannot void a paid invoice');

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'void' },
    });
  }

  async getStats(organizationId: string) {
    const [total, paid, overdue, draft, amtDue, amtPaid] = await Promise.all([
      prisma.invoice.count({ where: { organizationId } }),
      prisma.invoice.count({ where: { organizationId, status: 'paid' } }),
      prisma.invoice.count({ where: { organizationId, status: 'overdue' } }),
      prisma.invoice.count({ where: { organizationId, status: 'draft' } }),
      prisma.invoice.aggregate({ where: { organizationId }, _sum: { amountDue: true } }),
      prisma.invoice.aggregate({ where: { organizationId, status: 'paid' }, _sum: { amountPaid: true } }),
    ]);

    return {
      total,
      paid,
      overdue,
      draft,
      totalAmountDue: Number(amtDue._sum.amountDue ?? 0),
      totalAmountPaid: Number(amtPaid._sum.amountPaid ?? 0),
    };
  }

  // Mark overdue invoices (to be called by a scheduled job)
  async markOverdueInvoices() {
    const result = await prisma.invoice.updateMany({
      where: {
        status: { in: ['draft', 'sent'] },
        dueDate: { lt: new Date() },
      },
      data: { status: 'overdue' },
    });
    logger.info(`Marked ${result.count} invoices as overdue`);
    return result.count;
  }
}

export default new InvoiceService();
