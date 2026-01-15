import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import helcimService from './helcimService';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export interface CreatePaymentData {
  userId: string;
  amount: number;
  currency: string;
  cardToken: string;
  description?: string;
  paymentMethodId?: string;
}

class PaymentService {
  /**
   * Process a one-time payment
   */
  async processPayment(paymentData: CreatePaymentData) {
    const { userId, amount, currency, cardToken, description } = paymentData;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Create Helcim customer if not exists
    let helcimCustomerId = user.helcimCustomerId;

    if (!helcimCustomerId) {
      try {
        const helcimCustomer = await helcimService.createCustomer({
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        });

        helcimCustomerId = helcimCustomer.customerId;

        // Update user with Helcim customer ID
        await prisma.user.update({
          where: { id: userId },
          data: { helcimCustomerId },
        });
      } catch (error) {
        logger.error('Failed to create Helcim customer:', error);
        throw new AppError(500, 'Failed to create customer in payment processor');
      }
    }

    // Process payment with Helcim
    let helcimTransaction;
    try {
      helcimTransaction = await helcimService.processPayment({
        amount,
        currency,
        cardToken,
        customerId: helcimCustomerId,
        description,
      });
    } catch (error) {
      logger.error('Failed to process payment:', error);
      throw new AppError(500, 'Payment processing failed');
    }

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        userId,
        helcimTransactionId: helcimTransaction.transactionId,
        amount: new Decimal(amount),
        currency,
        status: helcimTransaction.status || 'completed',
        paymentMethodType: 'card',
        cardToken,
        description,
        metadata: helcimTransaction,
      },
    });

    logger.info(`Payment processed: ${payment.id} for user ${userId}`);

    return payment;
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string, userId: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId,
      },
    });

    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }

    return payment;
  }

  /**
   * Get payment history for user
   */
  async getPaymentHistory(userId: string, page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(status && { status }),
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, userId: string, amount?: number, reason?: string) {
    const payment = await this.getPaymentById(paymentId, userId);

    if (payment.status === 'refunded') {
      throw new AppError(400, 'Payment already refunded');
    }

    if (!payment.helcimTransactionId) {
      throw new AppError(400, 'Cannot refund payment without transaction ID');
    }

    // Process refund with Helcim
    try {
      const refundResult = await helcimService.refundTransaction(
        payment.helcimTransactionId,
        amount
      );

      // Update payment status
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'refunded',
          metadata: {
            ...(payment.metadata as object),
            refund: refundResult,
            refundReason: reason,
          },
        },
      });

      logger.info(`Payment refunded: ${paymentId}`);

      return refundResult;
    } catch (error) {
      logger.error('Failed to refund payment:', error);
      throw new AppError(500, 'Failed to process refund');
    }
  }

  /**
   * Get payment statistics for user
   */
  async getPaymentStats(userId: string) {
    const [totalPayments, completedPayments, totalAmount] = await Promise.all([
      prisma.payment.count({ where: { userId } }),
      prisma.payment.count({ where: { userId, status: 'completed' } }),
      prisma.payment.aggregate({
        where: { userId, status: 'completed' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalPayments,
      completedPayments,
      totalAmount: totalAmount._sum.amount || 0,
    };
  }
}

export default new PaymentService();
