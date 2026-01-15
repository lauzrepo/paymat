import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import helcimService from './helcimService';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

class InvoiceService {
  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count();
    return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Create an invoice
   */
  async createInvoice(
    userId: string,
    amount: number,
    currency: string,
    dueDate: Date,
    description?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        userId,
        invoiceNumber,
        amountDue: new Decimal(amount),
        amountPaid: new Decimal(0),
        currency,
        status: 'pending',
        dueDate,
      },
    });

    // Create invoice in Helcim if user has Helcim customer ID
    if (user.helcimCustomerId) {
      try {
        const helcimInvoice = await helcimService.createInvoice({
          customerId: user.helcimCustomerId,
          amount,
          dueDate: dueDate.toISOString().split('T')[0],
          items: [{ description: description || 'Invoice', amount }],
        });

        // Update invoice with Helcim invoice ID
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { helcimInvoiceId: helcimInvoice.invoiceId },
        });
      } catch (error) {
        logger.error('Failed to create Helcim invoice:', error);
        // Continue even if Helcim invoice creation fails
      }
    }

    logger.info(`Invoice created: ${invoice.id} for user ${userId}`);

    return invoice;
  }

  /**
   * Get invoices for user
   */
  async getInvoices(userId: string, page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(status && { status }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId: string, userId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId,
      },
    });

    if (!invoice) {
      throw new AppError(404, 'Invoice not found');
    }

    return invoice;
  }

  /**
   * Mark invoice as paid
   */
  async markInvoiceAsPaid(invoiceId: string, userId: string, amountPaid: number) {
    const invoice = await this.getInvoiceById(invoiceId, userId);

    if (invoice.status === 'paid') {
      throw new AppError(400, 'Invoice is already paid');
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        amountPaid: new Decimal(amountPaid),
        paidAt: new Date(),
      },
    });

    logger.info(`Invoice marked as paid: ${invoiceId}`);

    return updatedInvoice;
  }

  /**
   * Send invoice via email
   */
  async sendInvoice(invoiceId: string, userId: string) {
    const invoice = await this.getInvoiceById(invoiceId, userId);

    if (invoice.helcimInvoiceId) {
      try {
        await helcimService.sendInvoice(invoice.helcimInvoiceId);
        logger.info(`Invoice sent: ${invoiceId}`);
      } catch (error) {
        logger.error('Failed to send invoice via Helcim:', error);
        throw new AppError(500, 'Failed to send invoice');
      }
    } else {
      // TODO: Implement email sending without Helcim
      logger.warn(`Cannot send invoice ${invoiceId}: no Helcim invoice ID`);
      throw new AppError(400, 'Invoice cannot be sent electronically');
    }
  }

  /**
   * Get invoice PDF URL
   */
  async getInvoicePdfUrl(invoiceId: string, userId: string): Promise<string> {
    const invoice = await this.getInvoiceById(invoiceId, userId);

    if (invoice.invoicePdfUrl) {
      return invoice.invoicePdfUrl;
    }

    // TODO: Generate PDF if it doesn't exist
    throw new AppError(404, 'Invoice PDF not available');
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(userId: string) {
    const [totalInvoices, paidInvoices, pendingInvoices, totalAmount, paidAmount] =
      await Promise.all([
        prisma.invoice.count({ where: { userId } }),
        prisma.invoice.count({ where: { userId, status: 'paid' } }),
        prisma.invoice.count({ where: { userId, status: 'pending' } }),
        prisma.invoice.aggregate({
          where: { userId },
          _sum: { amountDue: true },
        }),
        prisma.invoice.aggregate({
          where: { userId, status: 'paid' },
          _sum: { amountPaid: true },
        }),
      ]);

    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalAmount: totalAmount._sum.amountDue || 0,
      paidAmount: paidAmount._sum.amountPaid || 0,
    };
  }
}

export default new InvoiceService();
