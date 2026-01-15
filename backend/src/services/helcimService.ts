import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { config } from '../config/environment';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

interface HelcimCustomer {
  email: string;
  firstName: string;
  lastName: string;
}

interface HelcimPayment {
  amount: number;
  currency: string;
  cardToken: string;
  customerId?: string;
  description?: string;
}

interface HelcimRecurringPlan {
  customerId: string;
  amount: number;
  frequency: string;
  cardToken: string;
}

class HelcimService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.helcim.baseUrl,
      headers: {
        Authorization: `Bearer ${config.helcim.apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Helcim API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Helcim API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Helcim API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        logger.error('Helcim API Response Error:', {
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Create a customer in Helcim
   */
  async createCustomer(customerData: HelcimCustomer) {
    try {
      const response = await this.client.post('/customers', {
        email: customerData.email,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
      });

      logger.info(`Helcim customer created: ${customerData.email}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create Helcim customer:', error);
      throw new AppError(500, 'Failed to create customer in payment processor');
    }
  }

  /**
   * Get customer details from Helcim
   */
  async getCustomer(customerId: string) {
    try {
      const response = await this.client.get(`/customers/${customerId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get Helcim customer ${customerId}:`, error);
      throw new AppError(500, 'Failed to retrieve customer from payment processor');
    }
  }

  /**
   * Process a one-time payment
   */
  async processPayment(paymentData: HelcimPayment) {
    try {
      const response = await this.client.post('/payment', {
        amount: paymentData.amount,
        currency: paymentData.currency,
        cardToken: paymentData.cardToken,
        customerId: paymentData.customerId,
        description: paymentData.description,
      });

      logger.info(`Helcim payment processed: ${response.data.transactionId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to process Helcim payment:', error);
      throw new AppError(500, 'Payment processing failed');
    }
  }

  /**
   * Create a card token (typically done on frontend with Helcim.js)
   */
  async createCardToken(cardData: {
    cardNumber: string;
    cvv: string;
    expiry: string;
  }) {
    try {
      const response = await this.client.post('/card-tokens', cardData);
      return response.data;
    } catch (error) {
      logger.error('Failed to create card token:', error);
      throw new AppError(500, 'Failed to tokenize card');
    }
  }

  /**
   * Get list of card tokens for a customer
   */
  async getCardTokens(customerId: string) {
    try {
      const response = await this.client.get(`/card-tokens`, {
        params: { customerId },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get card tokens:', error);
      throw new AppError(500, 'Failed to retrieve payment methods');
    }
  }

  /**
   * Delete a card token
   */
  async deleteCardToken(tokenId: string) {
    try {
      await this.client.delete(`/card-tokens/${tokenId}`);
      logger.info(`Card token deleted: ${tokenId}`);
    } catch (error) {
      logger.error('Failed to delete card token:', error);
      throw new AppError(500, 'Failed to delete payment method');
    }
  }

  /**
   * Create a recurring billing plan
   */
  async createRecurringPlan(planData: HelcimRecurringPlan) {
    try {
      const response = await this.client.post('/recurring', {
        customerId: planData.customerId,
        amount: planData.amount,
        frequency: planData.frequency,
        cardToken: planData.cardToken,
      });

      logger.info(`Recurring plan created: ${response.data.recurringId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create recurring plan:', error);
      throw new AppError(500, 'Failed to create subscription');
    }
  }

  /**
   * Get recurring plan details
   */
  async getRecurringPlan(recurringId: string) {
    try {
      const response = await this.client.get(`/recurring/${recurringId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get recurring plan ${recurringId}:`, error);
      throw new AppError(500, 'Failed to retrieve subscription');
    }
  }

  /**
   * Update a recurring plan
   */
  async updateRecurringPlan(recurringId: string, updateData: { amount?: number; frequency?: string }) {
    try {
      const response = await this.client.put(`/recurring/${recurringId}`, updateData);
      logger.info(`Recurring plan updated: ${recurringId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to update recurring plan:', error);
      throw new AppError(500, 'Failed to update subscription');
    }
  }

  /**
   * Cancel a recurring plan
   */
  async cancelRecurringPlan(recurringId: string) {
    try {
      await this.client.delete(`/recurring/${recurringId}`);
      logger.info(`Recurring plan cancelled: ${recurringId}`);
    } catch (error) {
      logger.error('Failed to cancel recurring plan:', error);
      throw new AppError(500, 'Failed to cancel subscription');
    }
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(transactionId: string, amount?: number) {
    try {
      const response = await this.client.post('/refund', {
        transactionId,
        amount,
      });

      logger.info(`Transaction refunded: ${transactionId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to refund transaction:', error);
      throw new AppError(500, 'Failed to process refund');
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId: string) {
    try {
      const response = await this.client.get(`/transactions/${transactionId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get transaction ${transactionId}:`, error);
      throw new AppError(500, 'Failed to retrieve transaction');
    }
  }

  /**
   * List transactions
   */
  async listTransactions(params?: { customerId?: string; dateFrom?: string; dateTo?: string }) {
    try {
      const response = await this.client.get('/transactions', { params });
      return response.data;
    } catch (error) {
      logger.error('Failed to list transactions:', error);
      throw new AppError(500, 'Failed to retrieve transactions');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', config.helcim.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Create an invoice
   */
  async createInvoice(invoiceData: {
    customerId: string;
    amount: number;
    dueDate: string;
    items: Array<{ description: string; amount: number }>;
  }) {
    try {
      const response = await this.client.post('/invoices', invoiceData);
      logger.info(`Invoice created: ${response.data.invoiceId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create invoice:', error);
      throw new AppError(500, 'Failed to create invoice');
    }
  }

  /**
   * Get invoice details
   */
  async getInvoice(invoiceId: string) {
    try {
      const response = await this.client.get(`/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get invoice ${invoiceId}:`, error);
      throw new AppError(500, 'Failed to retrieve invoice');
    }
  }

  /**
   * Send invoice via email
   */
  async sendInvoice(invoiceId: string) {
    try {
      await this.client.post(`/invoices/${invoiceId}/send`);
      logger.info(`Invoice sent: ${invoiceId}`);
    } catch (error) {
      logger.error('Failed to send invoice:', error);
      throw new AppError(500, 'Failed to send invoice');
    }
  }
}

export default new HelcimService();
