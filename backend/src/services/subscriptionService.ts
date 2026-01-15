import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import helcimService from './helcimService';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export interface SubscriptionPlan {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'yearly';
  description: string;
}

// Define available subscription plans
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic-monthly',
    name: 'Basic Monthly',
    amount: 25,
    frequency: 'monthly',
    description: 'Basic membership with monthly billing',
  },
  {
    id: 'basic-yearly',
    name: 'Basic Yearly',
    amount: 250,
    frequency: 'yearly',
    description: 'Basic membership with yearly billing (save $50)',
  },
  {
    id: 'premium-monthly',
    name: 'Premium Monthly',
    amount: 50,
    frequency: 'monthly',
    description: 'Premium membership with monthly billing',
  },
  {
    id: 'premium-yearly',
    name: 'Premium Yearly',
    amount: 500,
    frequency: 'yearly',
    description: 'Premium membership with yearly billing (save $100)',
  },
];

class SubscriptionService {
  /**
   * Get all available plans
   */
  getPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }

  /**
   * Get plan by ID
   */
  getPlanById(planId: string): SubscriptionPlan | undefined {
    return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
  }

  /**
   * Create a new subscription
   */
  async createSubscription(userId: string, planId: string, cardToken: string) {
    const plan = this.getPlanById(planId);

    if (!plan) {
      throw new AppError(404, 'Subscription plan not found');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
      },
    });

    if (existingSubscription) {
      throw new AppError(400, 'User already has an active subscription');
    }

    // Create Helcim customer if not exists
    let helcimCustomerId = user.helcimCustomerId;

    if (!helcimCustomerId) {
      const helcimCustomer = await helcimService.createCustomer({
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });

      helcimCustomerId = helcimCustomer.customerId;

      await prisma.user.update({
        where: { id: userId },
        data: { helcimCustomerId },
      });
    }

    // Create recurring plan in Helcim
    const helcimRecurring = await helcimService.createRecurringPlan({
      customerId: helcimCustomerId,
      amount: plan.amount,
      frequency: plan.frequency,
      cardToken,
    });

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.frequency === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Create subscription in database
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        helcimSubscriptionId: helcimRecurring.recurringId,
        planName: plan.name,
        planAmount: new Decimal(plan.amount),
        billingFrequency: plan.frequency,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
      },
    });

    logger.info(`Subscription created: ${subscription.id} for user ${userId}`);

    return subscription;
  }

  /**
   * Get active subscriptions for user
   */
  async getActiveSubscriptions(userId: string) {
    return await prisma.subscription.findMany({
      where: {
        userId,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(subscriptionId: string, userId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
    });

    if (!subscription) {
      throw new AppError(404, 'Subscription not found');
    }

    return subscription;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, userId: string, cancelAtPeriodEnd = true) {
    const subscription = await this.getSubscriptionById(subscriptionId, userId);

    if (subscription.status === 'canceled') {
      throw new AppError(400, 'Subscription already canceled');
    }

    if (!cancelAtPeriodEnd && subscription.helcimSubscriptionId) {
      // Cancel immediately in Helcim
      await helcimService.cancelRecurringPlan(subscription.helcimSubscriptionId);

      // Update subscription status
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
          cancelAtPeriodEnd: false,
        },
      });

      logger.info(`Subscription canceled immediately: ${subscriptionId}`);
    } else {
      // Cancel at period end
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          cancelAtPeriodEnd: true,
        },
      });

      logger.info(`Subscription set to cancel at period end: ${subscriptionId}`);
    }

    return await this.getSubscriptionById(subscriptionId, userId);
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(subscriptionId: string, userId: string, newPlanId: string) {
    const subscription = await this.getSubscriptionById(subscriptionId, userId);
    const newPlan = this.getPlanById(newPlanId);

    if (!newPlan) {
      throw new AppError(404, 'New plan not found');
    }

    if (subscription.status !== 'active') {
      throw new AppError(400, 'Can only update active subscriptions');
    }

    // Update in Helcim if subscription ID exists
    if (subscription.helcimSubscriptionId) {
      await helcimService.updateRecurringPlan(subscription.helcimSubscriptionId, {
        amount: newPlan.amount,
        frequency: newPlan.frequency,
      });
    }

    // Update in database
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planName: newPlan.name,
        planAmount: new Decimal(newPlan.amount),
        billingFrequency: newPlan.frequency,
      },
    });

    logger.info(`Subscription updated: ${subscriptionId} to plan ${newPlanId}`);

    return updated;
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(subscriptionId: string, userId: string) {
    const subscription = await this.getSubscriptionById(subscriptionId, userId);

    if (subscription.status === 'active') {
      throw new AppError(400, 'Subscription is already active');
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new AppError(400, 'Cannot reactivate a subscription canceled immediately');
    }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: false,
      },
    });

    logger.info(`Subscription reactivated: ${subscriptionId}`);

    return await this.getSubscriptionById(subscriptionId, userId);
  }
}

export default new SubscriptionService();
