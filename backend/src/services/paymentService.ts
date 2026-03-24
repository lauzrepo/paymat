import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import helcimService from './helcimService';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

const MANUAL_METHODS = ['cash', 'check', 'bank_transfer', 'other'];

export interface ProcessPaymentData {
  organizationId: string;
  invoiceId: string;
  userId?: string;
  amount: number;
  currency?: string;
  cardToken?: string;
  paymentMethodType?: string;
  notes?: string;
}

class PaymentService {
  async processPayment(data: ProcessPaymentData) {
    const { organizationId, invoiceId, userId, amount, currency = 'USD', cardToken, paymentMethodType = 'card', notes } = data;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { contact: true },
    });
    if (!invoice) throw new AppError(404, 'Invoice not found');
    if (invoice.status === 'paid') throw new AppError(400, 'Invoice is already paid');
    if (invoice.status === 'void') throw new AppError(400, 'Cannot pay a voided invoice');

    const isManual = !cardToken || MANUAL_METHODS.includes(paymentMethodType);

    let helcimTransactionId: string | undefined;
    let status = 'succeeded';

    if (!isManual) {
      const helcimTransaction = await helcimService.processPayment({
        amount,
        currency,
        cardToken: cardToken!,
        customerId: invoice.contact?.helcimToken ?? undefined,
      });
      helcimTransactionId = helcimTransaction.transactionId;
      status = helcimTransaction.status || 'succeeded';
    }

    const payment = await prisma.payment.create({
      data: {
        organizationId,
        invoiceId,
        userId,
        helcimTransactionId: helcimTransactionId ?? null,
        amount: new Decimal(amount),
        currency,
        status,
        paymentMethodType,
        cardToken: cardToken ?? null,
        notes,
      },
    });

    // Update invoice paid amount
    const newAmountPaid = Number(invoice.amountPaid) + amount;
    const isPaid = newAmountPaid >= Number(invoice.amountDue);
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: new Decimal(newAmountPaid),
        ...(isPaid && { status: 'paid', paidAt: new Date() }),
      },
    });

    logger.info(`Payment processed: ${payment.id} for invoice ${invoiceId}`);
    return payment;
  }

  async getPayments(organizationId: string, page = 1, limit = 20, filters: { status?: string; invoiceId?: string } = {}) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      ...(filters.status && { status: filters.status }),
      ...(filters.invoiceId && { invoiceId: filters.invoiceId }),
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { invoice: true, user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getPaymentById(paymentId: string, organizationId: string) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, organizationId },
      include: { invoice: true },
    });
    if (!payment) throw new AppError(404, 'Payment not found');
    return payment;
  }

  async refundPayment(paymentId: string, organizationId: string, amount?: number, _reason?: string) {
    const payment = await this.getPaymentById(paymentId, organizationId);
    if (payment.status === 'refunded') throw new AppError(400, 'Payment already refunded');
    if (!payment.helcimTransactionId) throw new AppError(400, 'Cannot refund payment without transaction ID');

    await helcimService.refundTransaction(payment.helcimTransactionId, amount);

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'refunded' },
    });

    logger.info(`Payment refunded: ${paymentId}`);
  }

  async getStats(organizationId: string) {
    const [total, succeeded, totalAmount] = await Promise.all([
      prisma.payment.count({ where: { organizationId } }),
      prisma.payment.count({ where: { organizationId, status: 'succeeded' } }),
      prisma.payment.aggregate({ where: { organizationId, status: 'succeeded' }, _sum: { amount: true } }),
    ]);
    return { total, succeeded, totalAmount: Number(totalAmount._sum.amount ?? 0) };
  }
}

export default new PaymentService();
