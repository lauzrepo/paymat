import prisma from '../../../src/config/database';

jest.mock('../../../src/services/stripeConnectService', () => ({
  __esModule: true,
  default: {
    chargeCustomer: jest.fn(),
  },
}));

jest.mock('../../../src/services/emailService', () => ({
  sendInvoiceGenerated: jest.fn().mockResolvedValue(undefined),
  sendPaymentReceived: jest.fn().mockResolvedValue(undefined),
  sendPaymentFailed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/config/environment', () => ({
  config: {
    email: { appUrl: 'https://app.cliqpaymat.app' },
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import stripeConnectService from '../../../src/services/stripeConnectService';
import { sendInvoiceGenerated, sendPaymentReceived, sendPaymentFailed } from '../../../src/services/emailService';

// billingService must be imported after mocks are in place
import billingService from '../../../src/services/billingService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'enroll-1',
    contactId: 'contact-1',
    nextBillingDate: new Date('2026-03-01T00:00:00.000Z'),
    contact: {
      id: 'contact-1',
      organizationId: 'org-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      stripeCustomerId: null,
      stripeDefaultPaymentMethodId: null,
      family: null,
      organization: { slug: 'test-org', name: 'Test Org', stripeConnectAccountId: null, platformFeePercent: 0 },
    },
    program: {
      id: 'prog-1',
      name: 'Soccer Academy',
      price: 100,
      billingFrequency: 'monthly',
      maxBillingCycles: null,
    },
    ...overrides,
  };
}

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invoice-1',
    invoiceNumber: 'INV-00001',
    status: 'sent',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BillingService.generateDueInvoices()', () => {
  describe('when there are no due enrollments', () => {
    it('returns zero counters and activeEnrollments count', async () => {
      (prisma.enrollment.count as jest.Mock).mockResolvedValue(3);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await billingService.generateDueInvoices();

      expect(result).toEqual({
        invoicesCreated: 0,
        autoCharged: 0,
        errors: 0,
        errorMessages: [],
        activeEnrollments: 3,
      });
      expect(prisma.invoice.create as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('when one enrollment is due', () => {
    it('creates an invoice and increments invoicesCreated', async () => {
      const enrollment = makeEnrollment();

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([enrollment]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice());
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await billingService.generateDueInvoices();

      expect(result.invoicesCreated).toBe(1);
      expect(result.autoCharged).toBe(0);
      expect(result.errors).toBe(0);
      expect(prisma.invoice.create as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when max billing cycles are reached', () => {
    it('cancels the enrollment and does NOT create an invoice', async () => {
      const enrollment = makeEnrollment({
        program: {
          id: 'prog-1',
          name: 'Soccer Academy',
          price: 100,
          billingFrequency: 'monthly',
          maxBillingCycles: 3,
        },
      });

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([enrollment]);
      // invoiceLineItem.count returns >= maxBillingCycles
      (prisma.invoiceLineItem.count as jest.Mock).mockResolvedValue(3);
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await billingService.generateDueInvoices();

      expect(result.invoicesCreated).toBe(0);
      expect(prisma.invoice.create as jest.Mock).not.toHaveBeenCalled();
      expect(prisma.enrollment.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: enrollment.id },
          data: expect.objectContaining({ status: 'cancelled', nextBillingDate: null }),
        }),
      );
    });
  });

  describe('nextBillingDate advancement', () => {
    async function runWithFrequency(billingFrequency: string) {
      const dueDate = new Date('2026-03-01T00:00:00.000Z');
      const enrollment = makeEnrollment({
        nextBillingDate: dueDate,
        program: {
          id: 'prog-1',
          name: 'Soccer Academy',
          price: 100,
          billingFrequency,
          maxBillingCycles: null,
        },
      });

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([enrollment]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice());
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await billingService.generateDueInvoices();

      const updateCall = (prisma.enrollment.update as jest.Mock).mock.calls.find(
        (call) => call[0].data?.nextBillingDate !== undefined,
      );
      return updateCall?.[0].data.nextBillingDate as Date | null;
    }

    it('advances nextBillingDate by one month for monthly frequency', async () => {
      const nextDate = await runWithFrequency('monthly');
      expect(nextDate).not.toBeNull();
      expect(nextDate!.getUTCMonth()).toBe(3); // April (0-indexed)
      expect(nextDate!.getUTCFullYear()).toBe(2026);
    });

    it('advances nextBillingDate by 7 days for weekly frequency', async () => {
      const nextDate = await runWithFrequency('weekly');
      expect(nextDate).not.toBeNull();
      const expected = new Date('2026-03-08T00:00:00.000Z');
      expect(nextDate!.toISOString()).toBe(expected.toISOString());
    });

    it('advances nextBillingDate by one year for yearly frequency', async () => {
      const nextDate = await runWithFrequency('yearly');
      expect(nextDate).not.toBeNull();
      expect(nextDate!.getUTCFullYear()).toBe(2027);
      expect(nextDate!.getUTCMonth()).toBe(2); // March
    });

    it('sets nextBillingDate to null for one_time frequency', async () => {
      const nextDate = await runWithFrequency('one_time');
      expect(nextDate).toBeNull();
    });
  });

  describe('auto-charge with Stripe payment method', () => {
    it('calls stripeConnectService.chargeCustomer, marks invoice paid, and increments autoCharged', async () => {
      const enrollment = makeEnrollment({
        contact: {
          id: 'contact-1',
          organizationId: 'org-1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          stripeCustomerId: 'cus_test',
          stripeDefaultPaymentMethodId: 'pm_test',
          family: null,
          organization: { slug: 'test-org', name: 'Test Org', stripeConnectAccountId: 'acct_test', platformFeePercent: 0, sandboxMode: true },
        },
      });

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([enrollment]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice({ id: 'invoice-1' }));
      (prisma.payment.create as jest.Mock).mockResolvedValue({});
      (prisma.invoice.update as jest.Mock).mockResolvedValue({});
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (stripeConnectService.chargeCustomer as jest.Mock).mockResolvedValue({
        paymentIntentId: 'pi_test',
        chargeId: 'ch_test',
        status: 'succeeded',
      });

      const result = await billingService.generateDueInvoices();

      expect(result.autoCharged).toBe(1);
      expect(stripeConnectService.chargeCustomer as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'cus_test', paymentMethodId: 'pm_test', amountCents: 10000, sandboxMode: true }),
      );
      expect(prisma.invoice.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'invoice-1' },
          data: expect.objectContaining({ status: 'paid' }),
        }),
      );
      expect(prisma.payment.create as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('does NOT auto-charge when contact has no Stripe payment method', async () => {
      const enrollment = makeEnrollment(); // stripeCustomerId: null, family: null

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([enrollment]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice());
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await billingService.generateDueInvoices();

      expect(result.autoCharged).toBe(0);
      expect(stripeConnectService.chargeCustomer as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('family-grouped invoicing', () => {
    function makeFamilyEnrollment(overrides: Record<string, unknown> = {}) {
      return {
        id: 'enroll-fam-1',
        contactId: 'contact-fam-1',
        nextBillingDate: new Date('2026-03-01T00:00:00.000Z'),
        contact: {
          id: 'contact-fam-1',
          organizationId: 'org-1',
          firstName: 'Emma',
          lastName: 'Johnson',
          email: 'emma@example.com',
          stripeCustomerId: null,
          stripeDefaultPaymentMethodId: null,
          familyId: 'family-1',
          family: {
            id: 'family-1',
            name: 'Johnson Family',
            stripeCustomerId: 'cus_fam_test',
            stripeDefaultPaymentMethodId: 'pm_fam_test',
            billingEmail: 'johnson.family@example.com',
          },
          organization: { slug: 'test-org', name: 'Test Org', stripeConnectAccountId: 'acct_test', platformFeePercent: 0, sandboxMode: true },
        },
        program: {
          id: 'prog-1',
          name: 'Beginner Karate',
          price: 120,
          billingFrequency: 'monthly',
          maxBillingCycles: null,
        },
        ...overrides,
      };
    }

    it('creates one family invoice (with familyId) for all contacts in the same family', async () => {
      const e1 = makeFamilyEnrollment();
      const e2 = makeFamilyEnrollment({
        id: 'enroll-fam-2',
        contactId: 'contact-fam-2',
        contact: {
          id: 'contact-fam-2',
          organizationId: 'org-1',
          firstName: 'Liam',
          lastName: 'Johnson',
          email: 'liam@example.com',
          stripeCustomerId: null,
          stripeDefaultPaymentMethodId: null,
          familyId: 'family-1',
          family: {
            id: 'family-1',
            name: 'Johnson Family',
            stripeCustomerId: 'cus_fam_test',
            stripeDefaultPaymentMethodId: 'pm_fam_test',
            billingEmail: 'johnson.family@example.com',
          },
          organization: { slug: 'test-org', name: 'Test Org', stripeConnectAccountId: 'acct_test', platformFeePercent: 0, sandboxMode: true },
        },
        program: {
          id: 'prog-2',
          name: 'Advanced Karate',
          price: 150,
          billingFrequency: 'monthly',
          maxBillingCycles: null,
        },
      });

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(2);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([e1, e2]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice({ id: 'fam-invoice-1' }));
      (prisma.payment.create as jest.Mock).mockResolvedValue({});
      (prisma.invoice.update as jest.Mock).mockResolvedValue({});
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (stripeConnectService.chargeCustomer as jest.Mock).mockResolvedValue({
        paymentIntentId: 'pi_fam',
        chargeId: 'ch_fam',
        status: 'succeeded',
      });

      const result = await billingService.generateDueInvoices();

      // One invoice for the whole family, not two individual invoices
      expect(prisma.invoice.create as jest.Mock).toHaveBeenCalledTimes(1);
      expect(result.invoicesCreated).toBe(1);

      const createCall = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.familyId).toBe('family-1');
      expect(createCall.data.contactId).toBeUndefined();
    });

    it('includes one line item per family member with contact name prefix', async () => {
      const e1 = makeFamilyEnrollment();

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([e1]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice({ id: 'fam-invoice-1' }));
      (prisma.payment.create as jest.Mock).mockResolvedValue({});
      (prisma.invoice.update as jest.Mock).mockResolvedValue({});
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (stripeConnectService.chargeCustomer as jest.Mock).mockResolvedValue({
        paymentIntentId: 'pi_fam',
        chargeId: 'ch_fam',
        status: 'succeeded',
      });

      await billingService.generateDueInvoices();

      const createCall = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
      const lineItems = createCall.data.lineItems.create;
      expect(lineItems).toHaveLength(1);
      expect(lineItems[0].description).toMatch(/Emma Johnson/);
      expect(lineItems[0].description).toMatch(/Beginner Karate/);
    });

    it('charges the family card for the combined total', async () => {
      const e1 = makeFamilyEnrollment(); // $120
      const e2 = makeFamilyEnrollment({
        id: 'enroll-fam-2',
        contactId: 'contact-fam-2',
        contact: {
          id: 'contact-fam-2',
          organizationId: 'org-1',
          firstName: 'Liam',
          lastName: 'Johnson',
          email: 'liam@example.com',
          stripeCustomerId: null,
          stripeDefaultPaymentMethodId: null,
          familyId: 'family-1',
          family: {
            id: 'family-1',
            name: 'Johnson Family',
            stripeCustomerId: 'cus_fam_test',
            stripeDefaultPaymentMethodId: 'pm_fam_test',
            billingEmail: null,
          },
          organization: { slug: 'test-org', name: 'Test Org', stripeConnectAccountId: 'acct_test', platformFeePercent: 0, sandboxMode: true },
        },
        program: {
          id: 'prog-2',
          name: 'Advanced Karate',
          price: 150,
          billingFrequency: 'monthly',
          maxBillingCycles: null,
        },
      });

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(2);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([e1, e2]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice({ id: 'fam-invoice-1' }));
      (prisma.payment.create as jest.Mock).mockResolvedValue({});
      (prisma.invoice.update as jest.Mock).mockResolvedValue({});
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (stripeConnectService.chargeCustomer as jest.Mock).mockResolvedValue({
        paymentIntentId: 'pi_fam',
        chargeId: 'ch_fam',
        status: 'succeeded',
      });

      const result = await billingService.generateDueInvoices();

      expect(result.autoCharged).toBe(1);
      expect(stripeConnectService.chargeCustomer as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'cus_fam_test', amountCents: 27000, sandboxMode: true }),
      );
    });

    it('sends payment received email to family.billingEmail when set', async () => {
      const e1 = makeFamilyEnrollment(); // billingEmail: 'johnson.family@example.com'

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([e1]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice({ id: 'fam-invoice-1' }));
      (prisma.payment.create as jest.Mock).mockResolvedValue({});
      (prisma.invoice.update as jest.Mock).mockResolvedValue({});
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (stripeConnectService.chargeCustomer as jest.Mock).mockResolvedValue({
        paymentIntentId: 'pi_fam',
        chargeId: 'ch_fam',
        status: 'succeeded',
      });

      await billingService.generateDueInvoices();
      await Promise.resolve();

      expect(sendPaymentReceived as jest.Mock).toHaveBeenCalledWith(
        'johnson.family@example.com',
        expect.objectContaining({ recipientName: 'Johnson Family' }),
      );
    });

    it('falls through to individual billing when family has no Stripe payment method', async () => {
      // Family exists but no Stripe IDs → treated as individual
      const enrollment = makeEnrollment({
        contact: {
          id: 'contact-1',
          organizationId: 'org-1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          stripeCustomerId: null,
          stripeDefaultPaymentMethodId: null,
          familyId: 'family-1',
          family: {
            id: 'family-1',
            name: 'Doe Family',
            stripeCustomerId: null,
            stripeDefaultPaymentMethodId: null,
            billingEmail: null,
          },
          organization: { slug: 'test-org', name: 'Test Org', stripeConnectAccountId: null, platformFeePercent: 0, sandboxMode: true },
        },
      });

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([enrollment]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice({ id: 'invoice-1' }));
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await billingService.generateDueInvoices();

      // Individual invoice — contactId set, not familyId
      const createCall = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.contactId).toBe('contact-1');
      expect(createCall.data.familyId).toBeUndefined();
      expect(result.invoicesCreated).toBe(1);
      expect(result.autoCharged).toBe(0); // no card to charge
    });
  });

  describe('auto-charge failure', () => {
    it('leaves invoice in sent status, does not increment autoCharged, and sends payment failed email', async () => {
      const enrollment = makeEnrollment({
        contact: {
          id: 'contact-1',
          organizationId: 'org-1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          stripeCustomerId: 'cus_bad',
          stripeDefaultPaymentMethodId: 'pm_bad',
          family: null,
          organization: { slug: 'test-org', name: 'Test Org', stripeConnectAccountId: 'acct_test', platformFeePercent: 0, sandboxMode: true },
        },
      });

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([enrollment]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice({ id: 'invoice-1' }));
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (stripeConnectService.chargeCustomer as jest.Mock).mockRejectedValue(new Error('Card declined'));

      const result = await billingService.generateDueInvoices();

      expect(result.autoCharged).toBe(0);
      // Invoice.update to paid should NOT have been called
      expect(prisma.invoice.update as jest.Mock).not.toHaveBeenCalled();
      // invoicesCreated still increments — the invoice was created
      expect(result.invoicesCreated).toBe(1);
      // sendPaymentFailed should fire (fire-and-forget, may need to flush)
      await Promise.resolve(); // flush micro-tasks
      expect(sendPaymentFailed as jest.Mock).toHaveBeenCalled();
    });
  });

  describe('overdue invoice marking', () => {
    it('calls invoice.updateMany to mark overdue invoices at the end of the run', async () => {
      (prisma.enrollment.count as jest.Mock).mockResolvedValue(0);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await billingService.generateDueInvoices();

      expect(prisma.invoice.updateMany as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['draft', 'sent'] },
            dueDate: expect.objectContaining({ lt: expect.any(Date) }),
          }),
          data: { status: 'overdue' },
        }),
      );
    });
  });

  describe('organizationId scoping', () => {
    it('passes organizationId filter to findMany and updateMany when provided', async () => {
      (prisma.enrollment.count as jest.Mock).mockResolvedValue(0);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await billingService.generateDueInvoices('org-42');

      expect(prisma.enrollment.findMany as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contact: { organizationId: 'org-42' },
          }),
        }),
      );

      expect(prisma.invoice.updateMany as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-42' }),
        }),
      );
    });

    it('omits contact filter when organizationId is not provided', async () => {
      (prisma.enrollment.count as jest.Mock).mockResolvedValue(0);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await billingService.generateDueInvoices();

      const findManyCall = (prisma.enrollment.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.contact).toBeUndefined();
    });
  });

  describe('sandboxMode threading', () => {
    it('passes sandboxMode=false from org to chargeCustomer when org is in production', async () => {
      const enrollment = makeEnrollment({
        contact: {
          id: 'contact-1',
          organizationId: 'org-1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          stripeCustomerId: 'cus_live',
          stripeDefaultPaymentMethodId: 'pm_live',
          family: null,
          organization: { slug: 'test-org', name: 'Test Org', stripeConnectAccountId: 'acct_live', platformFeePercent: 0, sandboxMode: false },
        },
      });

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([enrollment]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice({ id: 'invoice-live' }));
      (prisma.payment.create as jest.Mock).mockResolvedValue({});
      (prisma.invoice.update as jest.Mock).mockResolvedValue({});
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (stripeConnectService.chargeCustomer as jest.Mock).mockResolvedValue({
        paymentIntentId: 'pi_live', chargeId: 'ch_live', status: 'succeeded',
      });

      await billingService.generateDueInvoices();

      expect(stripeConnectService.chargeCustomer as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ sandboxMode: false }),
      );
    });

    it('defaults sandboxMode to true when org.sandboxMode is undefined', async () => {
      const enrollment = makeEnrollment({
        contact: {
          id: 'contact-1',
          organizationId: 'org-1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          stripeCustomerId: 'cus_test',
          stripeDefaultPaymentMethodId: 'pm_test',
          family: null,
          organization: { slug: 'test-org', name: 'Test Org', stripeConnectAccountId: 'acct_test', platformFeePercent: 0, sandboxMode: undefined },
        },
      });

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([enrollment]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice({ id: 'invoice-1' }));
      (prisma.payment.create as jest.Mock).mockResolvedValue({});
      (prisma.invoice.update as jest.Mock).mockResolvedValue({});
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (stripeConnectService.chargeCustomer as jest.Mock).mockResolvedValue({
        paymentIntentId: 'pi_test', chargeId: 'ch_test', status: 'succeeded',
      });

      await billingService.generateDueInvoices();

      expect(stripeConnectService.chargeCustomer as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ sandboxMode: true }),
      );
    });
  });

  describe('UTC midnight date comparison', () => {
    it('uses UTC midnight for the today date boundary', async () => {
      (prisma.enrollment.count as jest.Mock).mockResolvedValue(0);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await billingService.generateDueInvoices();

      const findManyCall = (prisma.enrollment.findMany as jest.Mock).mock.calls[0][0];
      const todayUsed: Date = findManyCall.where.nextBillingDate.lte;

      expect(todayUsed.getUTCHours()).toBe(0);
      expect(todayUsed.getUTCMinutes()).toBe(0);
      expect(todayUsed.getUTCSeconds()).toBe(0);
      expect(todayUsed.getUTCMilliseconds()).toBe(0);
    });
  });

  describe('email notifications', () => {
    it('sends sendInvoiceGenerated email when contact has an email address', async () => {
      const enrollment = makeEnrollment();

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([enrollment]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice());
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await billingService.generateDueInvoices();
      // flush fire-and-forget promise
      await Promise.resolve();

      expect(sendInvoiceGenerated as jest.Mock).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({
          recipientName: 'Jane Doe',
          invoiceNumber: 'INV-00001',
          amount: 100,
        }),
      );
    });

    it('sends sendPaymentReceived after successful auto-charge', async () => {
      const enrollment = makeEnrollment({
        contact: {
          id: 'contact-1',
          organizationId: 'org-1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          stripeCustomerId: 'cus_test',
          stripeDefaultPaymentMethodId: 'pm_test',
          family: null,
          organization: { slug: 'test-org', name: 'Test Org', stripeConnectAccountId: 'acct_test', platformFeePercent: 0, sandboxMode: true },
        },
      });

      (prisma.enrollment.count as jest.Mock).mockResolvedValue(1);
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([enrollment]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice());
      (prisma.payment.create as jest.Mock).mockResolvedValue({});
      (prisma.invoice.update as jest.Mock).mockResolvedValue({});
      (prisma.enrollment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (stripeConnectService.chargeCustomer as jest.Mock).mockResolvedValue({
        paymentIntentId: 'pi_test',
        chargeId: 'ch_test',
        status: 'succeeded',
      });

      await billingService.generateDueInvoices();
      await Promise.resolve();

      expect(sendPaymentReceived as jest.Mock).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({ invoiceNumber: 'INV-00001' }),
      );
    });
  });
});
