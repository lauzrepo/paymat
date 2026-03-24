import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config/environment';
import logger from '../utils/logger';

const helcimAxios = axios.create({
  baseURL: config.helcim.baseUrl,
  headers: {
    'api-token': config.helcim.apiToken,
    'Content-Type': 'application/json',
  },
});

const stub = (method: string, data?: object) =>
  logger.debug(`[HelcimStub] ${method}`, data ?? {});

class HelcimService {
  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------

  async processPayment(data: {
    amount: number;
    currency: string;
    cardToken: string;
    customerId?: string;
    description?: string;
  }) {
    if (config.helcim.testMode) {
      stub('processPayment', data);
      return { transactionId: `test-txn-${Date.now()}`, status: 'succeeded', amount: data.amount, currency: data.currency };
    }

    logger.info(`[Helcim] processPayment $${data.amount} ${data.currency}`);
    const response = await helcimAxios.post('/payment/purchase', {
      ipAddress: '127.0.0.1',
      currency: data.currency,
      amount: data.amount,
      cardData: { cardToken: data.cardToken },
      ecommerce: 1,
    }, {
      headers: { 'idempotency-key': crypto.randomUUID() },
    });

    const tx = response.data;
    logger.info(`[Helcim] transaction ${tx.transactionId} status=${tx.status}`);
    return {
      transactionId: String(tx.transactionId),
      status: tx.status === 'APPROVED' ? 'succeeded' : 'failed',
      amount: tx.amount,
      currency: tx.currency,
    };
  }

  async refundTransaction(transactionId: string, amount?: number) {
    if (config.helcim.testMode) {
      stub('refundTransaction', { transactionId, amount });
      return { refundId: `test-refund-${Date.now()}`, transactionId, status: 'refunded', amount };
    }

    logger.info(`[Helcim] refund txn ${transactionId}`);
    const response = await helcimAxios.post('/payment/refund', {
      ipAddress: '127.0.0.1',
      originalTransactionId: parseInt(transactionId, 10),
      ...(amount !== undefined && { amount }),
    }, {
      headers: { 'idempotency-key': crypto.randomUUID() },
    });

    const tx = response.data;
    return {
      refundId: String(tx.transactionId),
      transactionId,
      status: 'refunded',
      amount: tx.amount,
    };
  }

  // ---------------------------------------------------------------------------
  // HelcimPay.js — card tokenization
  // ---------------------------------------------------------------------------

  async initializeCheckout(amount = 0, currency = 'USD') {
    if (config.helcim.testMode) {
      stub('initializeCheckout', { amount, currency });
      return { secretToken: 'test-secret', checkoutToken: 'test-checkout-token' };
    }

    logger.info(`[Helcim] initializeCheckout amount=${amount}`);
    const response = await helcimAxios.post('/helcim-pay/initialize', {
      paymentType: 'purchase',
      amount,
      currency,
      hasConvenienceFee: false,
    });
    return response.data as { secretToken: string; checkoutToken: string };
  }

  // ---------------------------------------------------------------------------
  // Misc (retained for future use, not called by billing flow)
  // ---------------------------------------------------------------------------

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', config.helcim.webhookSecret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  async getTransaction(transactionId: string) {
    const response = await helcimAxios.get(`/transactions/${transactionId}`);
    return response.data;
  }
}

export default new HelcimService();
