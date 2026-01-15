import prisma from '../config/database';
import helcimService from './helcimService';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export interface SavePaymentMethodData {
  userId: string;
  cardToken: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  cardholderName?: string;
  setAsDefault?: boolean;
}

class PaymentMethodService {
  /**
   * Save a payment method
   */
  async savePaymentMethod(data: SavePaymentMethodData) {
    const { userId, cardToken, last4, brand, expMonth, expYear, cardholderName, setAsDefault } =
      data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // If setting as default, unset other default payment methods
    if (setAsDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if this is the first payment method
    const existingMethods = await prisma.paymentMethod.count({
      where: { userId },
    });

    const isFirst = existingMethods === 0;

    // Create payment method
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId,
        helcimCardToken: cardToken,
        type: 'card',
        last4,
        brand,
        expMonth,
        expYear,
        cardholderName,
        isDefault: setAsDefault || isFirst, // First payment method is default by default
      },
    });

    logger.info(`Payment method saved: ${paymentMethod.id} for user ${userId}`);

    return paymentMethod;
  }

  /**
   * Get all payment methods for user
   */
  async getPaymentMethods(userId: string) {
    return await prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get payment method by ID
   */
  async getPaymentMethodById(paymentMethodId: string, userId: string) {
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        userId,
      },
    });

    if (!paymentMethod) {
      throw new AppError(404, 'Payment method not found');
    }

    return paymentMethod;
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(paymentMethodId: string, userId: string) {
    const paymentMethod = await this.getPaymentMethodById(paymentMethodId, userId);

    // Delete from Helcim
    try {
      await helcimService.deleteCardToken(paymentMethod.helcimCardToken);
    } catch (error) {
      logger.error('Failed to delete card token from Helcim:', error);
      // Continue with database deletion even if Helcim deletion fails
    }

    // Delete from database
    await prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });

    // If this was the default, set another as default
    if (paymentMethod.isDefault) {
      const nextMethod = await prisma.paymentMethod.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (nextMethod) {
        await prisma.paymentMethod.update({
          where: { id: nextMethod.id },
          data: { isDefault: true },
        });
      }
    }

    logger.info(`Payment method deleted: ${paymentMethodId}`);
  }

  /**
   * Set payment method as default
   */
  async setAsDefault(paymentMethodId: string, userId: string) {
    const paymentMethod = await this.getPaymentMethodById(paymentMethodId, userId);

    if (paymentMethod.isDefault) {
      return paymentMethod;
    }

    // Unset other default payment methods
    await prisma.paymentMethod.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Set this as default
    const updated = await prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: { isDefault: true },
    });

    logger.info(`Payment method set as default: ${paymentMethodId}`);

    return updated;
  }

  /**
   * Get default payment method for user
   */
  async getDefaultPaymentMethod(userId: string) {
    return await prisma.paymentMethod.findFirst({
      where: { userId, isDefault: true },
    });
  }
}

export default new PaymentMethodService();
