import prisma from '../../../src/config/database';
import paymentService from '../../../src/services/paymentService';
import stripeConnectService from '../../../src/services/stripeConnectService';

jest.mock('../../../src/services/stripeConnectService', () => ({
  __esModule: true,
  default: {
    refundCharge: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── shared fixtures ────────────────────────────────────────────────────────

const ORG_ID = 'org-1';
const INVOICE_ID = 'inv-1';
const PAYMENT_ID = 'pay-1';

const baseInvoice = {
  id: INVOICE_ID,
  organizationId: ORG_ID,
  status: 'draft',
  amountDue: 100,
  amountPaid: 0,
};

const basePayment = {
  id: PAYMENT_ID,
  organizationId: ORG_ID,
  invoiceId: INVOICE_ID,
  status: 'succeeded',
  stripeChargeId: 'ch_test',
  stripePaymentIntentId: 'pi_test',
  amount: 100,
};

// ─── processPayment ──────────────────────────────────────────────────────────

describe('paymentService.processPayment', () => {
  const cardData = {
    organizationId: ORG_ID,
    invoiceId: INVOICE_ID,
    amount: 100,
    cardToken: 'tok-card',
    paymentMethodType: 'card',
  };

  // card path — guard rails
  describe('guard rails', () => {
    it('throws 404 if invoice is not found', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(paymentService.processPayment(cardData)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Invoice not found',
      });
    });

    it('throws 400 if invoice is already paid', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...baseInvoice,
        status: 'paid',
      });

      await expect(paymentService.processPayment(cardData)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invoice is already paid',
      });
    });

    it('throws 400 if invoice is voided', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...baseInvoice,
        status: 'void',
      });

      await expect(paymentService.processPayment(cardData)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Cannot pay a voided invoice',
      });
    });
  });

  // card path — now rejected at the service level
  describe('card path', () => {
    it('throws 400 for card payment attempts (must go through member portal)', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({ ...baseInvoice });

      await expect(paymentService.processPayment(cardData)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Card payments must be made through the member portal',
      });
    });
  });

  // manual path
  describe('manual path (cash / check)', () => {
    const cashData = {
      organizationId: ORG_ID,
      invoiceId: INVOICE_ID,
      amount: 100,
      paymentMethodType: 'cash',
    };

    beforeEach(() => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({ ...baseInvoice });
      (prisma.payment.create as jest.Mock).mockResolvedValue({
        ...basePayment,
        helcimTransactionId: null,
      });
      (prisma.invoice.update as jest.Mock).mockResolvedValue({});
    });

    it('creates payment with cash paymentMethodType', async () => {
      await paymentService.processPayment(cashData);

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentMethodType: 'cash',
          }),
        }),
      );
    });

    it('marks invoice as paid when payment fully covers amountDue', async () => {
      await paymentService.processPayment(cashData);

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'paid' }),
        }),
      );
    });

    it('does not change invoice status on partial payment', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...baseInvoice,
        amountDue: 200,
        amountPaid: 0,
      });

      await paymentService.processPayment({ ...cashData, amount: 50 });

      const updateCall = (prisma.invoice.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('status');
    });

    it('still updates invoice amountPaid', async () => {
      await paymentService.processPayment(cashData);

      expect(prisma.invoice.update).toHaveBeenCalled();
    });
  });
});

// ─── getPayments ─────────────────────────────────────────────────────────────

describe('paymentService.getPayments', () => {
  const payments = [{ ...basePayment }, { ...basePayment, id: 'pay-2' }];

  beforeEach(() => {
    (prisma.payment.findMany as jest.Mock).mockResolvedValue(payments);
    (prisma.payment.count as jest.Mock).mockResolvedValue(2);
  });

  it('returns paginated list with metadata', async () => {
    const result = await paymentService.getPayments(ORG_ID, 1, 20);

    expect(result).toEqual({
      payments,
      total: 2,
      page: 1,
      totalPages: 1,
    });
  });

  it('applies status filter when provided', async () => {
    await paymentService.getPayments(ORG_ID, 1, 20, { status: 'succeeded' });

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'succeeded' }),
      }),
    );
  });

  it('applies invoiceId filter when provided', async () => {
    await paymentService.getPayments(ORG_ID, 1, 20, { invoiceId: INVOICE_ID });

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ invoiceId: INVOICE_ID }),
      }),
    );
  });
});

// ─── getPaymentById ───────────────────────────────────────────────────────────

describe('paymentService.getPaymentById', () => {
  it('returns the payment when found', async () => {
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({ ...basePayment });

    const result = await paymentService.getPaymentById(PAYMENT_ID, ORG_ID);

    expect(result).toMatchObject({ id: PAYMENT_ID });
  });

  it('throws 404 when not found', async () => {
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(paymentService.getPaymentById(PAYMENT_ID, ORG_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Payment not found',
    });
  });
});

// ─── refundPayment ────────────────────────────────────────────────────────────

describe('paymentService.refundPayment', () => {
  beforeEach(() => {
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({ ...basePayment });
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ stripeConnectAccountId: 'acct_test', sandboxMode: true });
    (stripeConnectService.refundCharge as jest.Mock).mockResolvedValue(undefined);
    (prisma.payment.update as jest.Mock).mockResolvedValue({});
  });

  it('throws 400 if payment is already refunded', async () => {
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      ...basePayment,
      status: 'refunded',
    });

    await expect(paymentService.refundPayment(PAYMENT_ID, ORG_ID)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Payment already refunded',
    });
  });

  it('throws 400 if payment has no stripeChargeId', async () => {
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      ...basePayment,
      stripeChargeId: null,
    });

    await expect(paymentService.refundPayment(PAYMENT_ID, ORG_ID)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('calls stripeConnectService.refundCharge with the charge ID and sandboxMode', async () => {
    await paymentService.refundPayment(PAYMENT_ID, ORG_ID);

    expect(stripeConnectService.refundCharge).toHaveBeenCalledWith('acct_test', 'ch_test', undefined, true);
  });

  it('passes sandboxMode=false when org is in production mode', async () => {
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      stripeConnectAccountId: 'acct_live', sandboxMode: false,
    });

    await paymentService.refundPayment(PAYMENT_ID, ORG_ID);

    expect(stripeConnectService.refundCharge).toHaveBeenCalledWith('acct_live', 'ch_test', undefined, false);
  });

  it('updates payment status to refunded', async () => {
    await paymentService.refundPayment(PAYMENT_ID, ORG_ID);

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PAYMENT_ID },
        data: { status: 'refunded' },
      }),
    );
  });
});

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('paymentService.getStats', () => {
  it('returns total, succeeded, and totalAmount', async () => {
    (prisma.payment.count as jest.Mock)
      .mockResolvedValueOnce(10)  // total
      .mockResolvedValueOnce(8);  // succeeded
    (prisma.payment.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: 450.75 },
    });

    const result = await paymentService.getStats(ORG_ID);

    expect(result).toEqual({ total: 10, succeeded: 8, totalAmount: 450.75 });
  });

  it('handles null aggregate sum and returns 0', async () => {
    (prisma.payment.count as jest.Mock)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    (prisma.payment.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: null },
    });

    const result = await paymentService.getStats(ORG_ID);

    expect(result.totalAmount).toBe(0);
  });
});
