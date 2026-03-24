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

  /**
   * Initialize a HelcimPay.js checkout session used to tokenize a card.
   * Amount $0 is enough to capture a card token without charging.
   */
  async initializeCheckout(amount = 0, currency = 'USD') {
    logger.info(`[Helcim] initializeCheckout amount=${amount}`);
    const response = await helcimAxios.post('/helcim-pay/initialize', {
      paymentType: 'purchase',
      amount,
      currency,
      hasConvenienceFee: false,
    });
    // Returns { secretToken, checkoutToken }
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
