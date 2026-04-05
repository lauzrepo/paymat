import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;
import prisma from '../config/database';
import stripeConnectService from './stripeConnectService';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

const MANUAL_METHODS = ['cash', 'check', 'bank_transfer', 'other'];

export interface ProcessPaymentData {
  organizationId: string;
  invoiceId: string;
  userId?: string;
  amount: number;
  currency?: string;
  paymentMethodType?: string;
  notes?: string;
}

class PaymentService {
  async processPayment(data: ProcessPaymentData) {
    const { organizationId, invoiceId, userId, amount, currency = 'USD', paymentMethodType = 'cash', notes } = data;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });
    if (!invoice) throw new AppError(404, 'Invoice not found');
    if (invoice.status === 'paid') throw new AppError(400, 'Invoice is already paid');
    if (invoice.status === 'void') throw new AppError(400, 'Cannot pay a voided invoice');

    if (!MANUAL_METHODS.includes(paymentMethodType)) {
      throw new AppError(400, 'Card payments must be made through the member portal');
    }

    const payment = await prisma.payment.create({
      data: {
        organizationId,
        invoiceId,
        userId,
        amount: new Decimal(amount),
        currency,
        status: 'succeeded',
        paymentMethodType,
        notes,
      },
    });

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

    if (!payment.stripeChargeId) {
      throw new AppError(400, 'Cannot refund this payment — no Stripe charge ID on record');
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { stripeConnectAccountId: true },
    });
    if (!org?.stripeConnectAccountId) throw new AppError(400, 'Organization payment processing not configured');

    const amountCents = amount !== undefined ? Math.round(amount * 100) : undefined;
    await stripeConnectService.refundCharge(org.stripeConnectAccountId, payment.stripeChargeId, amountCents);

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
