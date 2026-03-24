import crypto from 'crypto';
import { config } from '../config/environment';
import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// STUB — Helcim API is not called. All methods return fake data so the server
// can run locally without real credentials.
// ---------------------------------------------------------------------------

const stub = (method: string, data?: object) => {
  logger.debug(`[HelcimStub] ${method}`, data ?? {});
};

class HelcimService {
  async createCustomer(customerData: { email: string; firstName: string; lastName: string }) {
    stub('createCustomer', customerData);
    return { customerId: `stub-customer-${Date.now()}`, ...customerData };
  }

  async getCustomer(customerId: string) {
    stub('getCustomer', { customerId });
    return { customerId, email: 'stub@example.com', firstName: 'Stub', lastName: 'User' };
  }

  async processPayment(paymentData: { amount: number; currency: string; cardToken: string; customerId?: string; description?: string }) {
    stub('processPayment', paymentData);
    return {
      transactionId: `stub-txn-${Date.now()}`,
      status: 'approved',
      amount: paymentData.amount,
      currency: paymentData.currency,
    };
  }

  async createCardToken(_cardData: { cardNumber: string; cvv: string; expiry: string }) {
    stub('createCardToken');
    return { cardToken: `stub-token-${Date.now()}`, last4: '4242', brand: 'Visa' };
  }

  async getCardTokens(customerId: string) {
    stub('getCardTokens', { customerId });
    return { tokens: [] };
  }

  async deleteCardToken(tokenId: string) {
    stub('deleteCardToken', { tokenId });
  }

  async createRecurringPlan(planData: { customerId: string; amount: number; frequency: string; cardToken: string }) {
    stub('createRecurringPlan', planData);
    return { recurringId: `stub-recurring-${Date.now()}`, status: 'active', ...planData };
  }

  async getRecurringPlan(recurringId: string) {
    stub('getRecurringPlan', { recurringId });
    return { recurringId, status: 'active' };
  }

  async updateRecurringPlan(recurringId: string, updateData: { amount?: number; frequency?: string }) {
    stub('updateRecurringPlan', { recurringId, ...updateData });
    return { recurringId, status: 'active', ...updateData };
  }

  async cancelRecurringPlan(recurringId: string) {
    stub('cancelRecurringPlan', { recurringId });
  }

  async refundTransaction(transactionId: string, amount?: number) {
    stub('refundTransaction', { transactionId, amount });
    return { refundId: `stub-refund-${Date.now()}`, transactionId, status: 'refunded', amount };
  }

  async getTransaction(transactionId: string) {
    stub('getTransaction', { transactionId });
    return { transactionId, status: 'approved' };
  }

  async listTransactions(params?: { customerId?: string; dateFrom?: string; dateTo?: string }) {
    stub('listTransactions', params);
    return { transactions: [] };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', config.helcim.webhookSecret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  async createInvoice(invoiceData: { customerId: string; amount: number; dueDate: string; items: Array<{ description: string; amount: number }> }) {
    stub('createInvoice', invoiceData);
    return { invoiceId: `stub-invoice-${Date.now()}`, status: 'created', ...invoiceData };
  }

  async getInvoice(invoiceId: string) {
    stub('getInvoice', { invoiceId });
    return { invoiceId, status: 'created' };
  }

  async sendInvoice(invoiceId: string) {
    stub('sendInvoice', { invoiceId });
  }
}

export default new HelcimService();
