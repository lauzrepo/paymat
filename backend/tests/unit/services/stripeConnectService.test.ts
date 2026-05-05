// Unit tests for stripeConnectService — focussed on dual-mode (sandbox/live) behaviour.
//
// Strategy: mock the `stripe` module so the Stripe constructor never hits the network.
// The singleton (`export default new StripeConnectService()`) has already been loaded
// by the time tests run, so we spy on the lazily-initialised clients via the Stripe mock.

jest.mock('../../../src/config/environment', () => ({
  config: {
    stripe: {
      secretKey: 'sk_test_placeholder',
      secretKeyLive: 'sk_live_placeholder',
      publishableKey: 'pk_test_placeholder',
      publishableKeyLive: 'pk_live_placeholder',
      applicationFeePercent: 0,
    },
    email: { appUrl: 'https://app.cliqpaymat.app' },
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Build a minimal Stripe instance mock that records which key it was created with
const makeStripeMock = (key: string) => ({
  _key: key,
  accounts: {
    create: jest.fn().mockResolvedValue({ id: `acct_${key.slice(3, 8)}` }),
    retrieve: jest.fn().mockResolvedValue({ charges_enabled: true, details_submitted: true }),
    createLoginLink: jest.fn().mockResolvedValue({ url: 'https://stripe.com/login' }),
  },
  accountLinks: {
    create: jest.fn().mockResolvedValue({ url: 'https://stripe.com/onboard' }),
  },
  customers: {
    create: jest.fn().mockResolvedValue({ id: `cus_${key.slice(3, 8)}` }),
  },
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'pi_test',
      client_secret: 'pi_test_secret',
      status: 'requires_payment_method',
      latest_charge: null,
    }),
    retrieve: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded' }),
  },
  setupIntents: {
    create: jest.fn().mockResolvedValue({ client_secret: 'seti_test_secret' }),
  },
  refunds: {
    create: jest.fn().mockResolvedValue({ id: 're_test' }),
  },
  webhooks: {
    constructEvent: jest.fn().mockReturnValue({ type: 'test' }),
  },
});

const testInstance = makeStripeMock('sk_test_placeholder');
const liveInstance = makeStripeMock('sk_live_placeholder');

const MockStripe = jest.fn().mockImplementation((key: string) => {
  if (key === 'sk_test_placeholder') return testInstance;
  if (key === 'sk_live_placeholder') return liveInstance;
  throw new Error(`Unexpected Stripe key: ${key}`);
});

jest.mock('stripe', () => MockStripe);

// Import AFTER mocks are in place — the singleton is created on import
// We need to use jest.isolateModules so the singleton is freshly created with our mocks
let stripeConnectService: typeof import('../../../src/services/stripeConnectService').default;

beforeAll(() => {
  jest.isolateModules(() => {
    stripeConnectService = require('../../../src/services/stripeConnectService').default;
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── getPublishableKey ────────────────────────────────────────────────────────

describe('getPublishableKey', () => {
  it('returns the test publishable key in sandbox mode', () => {
    expect(stripeConnectService.getPublishableKey(true)).toBe('pk_test_placeholder');
  });

  it('returns the live publishable key in production mode', () => {
    expect(stripeConnectService.getPublishableKey(false)).toBe('pk_live_placeholder');
  });
});

// ─── createConnectAccount ─────────────────────────────────────────────────────

describe('createConnectAccount', () => {
  it('uses the test Stripe client in sandbox mode', async () => {
    const accountId = await stripeConnectService.createConnectAccount('org-1', 'Test Org', 'admin@test.com', true);

    expect(testInstance.accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'express',
        email: 'admin@test.com',
        metadata: { organizationId: 'org-1' },
      }),
    );
    expect(accountId).toBeDefined();
  });

  it('uses the live Stripe client in production mode', async () => {
    await stripeConnectService.createConnectAccount('org-1', 'Live Org', 'live@test.com', false);

    expect(liveInstance.accounts.create).toHaveBeenCalled();
    expect(testInstance.accounts.create).not.toHaveBeenCalled();
  });
});

// ─── createPaymentIntent ──────────────────────────────────────────────────────

describe('createPaymentIntent', () => {
  it('uses test client in sandbox mode and returns clientSecret + paymentIntentId', async () => {
    const result = await stripeConnectService.createPaymentIntent('acct_test', 5000, 'USD', null, {}, 0, true);

    expect(testInstance.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5000, currency: 'usd' }),
      expect.objectContaining({ stripeAccount: 'acct_test' }),
    );
    expect(result.clientSecret).toBeDefined();
    expect(result.paymentIntentId).toBeDefined();
  });

  it('uses live client in production mode', async () => {
    await stripeConnectService.createPaymentIntent('acct_live', 5000, 'USD', null, {}, 0, false);

    expect(liveInstance.paymentIntents.create).toHaveBeenCalled();
    expect(testInstance.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('applies application fee when feePercent > 0', async () => {
    await stripeConnectService.createPaymentIntent('acct_test', 10000, 'USD', null, {}, 2.5, true);

    expect(testInstance.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ application_fee_amount: 250 }),
      expect.any(Object),
    );
  });

  it('does not apply application fee when feePercent is 0', async () => {
    await stripeConnectService.createPaymentIntent('acct_test', 10000, 'USD', null, {}, 0, true);

    const call = (testInstance.paymentIntents.create as jest.Mock).mock.calls[0][0];
    expect(call.application_fee_amount).toBeUndefined();
  });
});

// ─── refundCharge ─────────────────────────────────────────────────────────────

describe('refundCharge', () => {
  it('uses test client in sandbox mode', async () => {
    await stripeConnectService.refundCharge('acct_test', 'ch_test', undefined, true);

    expect(testInstance.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ charge: 'ch_test' }),
      expect.objectContaining({ stripeAccount: 'acct_test' }),
    );
  });

  it('uses live client in production mode', async () => {
    await stripeConnectService.refundCharge('acct_live', 'ch_live', undefined, false);

    expect(liveInstance.refunds.create).toHaveBeenCalled();
    expect(testInstance.refunds.create).not.toHaveBeenCalled();
  });

  it('passes amountCents when provided', async () => {
    await stripeConnectService.refundCharge('acct_test', 'ch_test', 5000, true);

    expect(testInstance.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ charge: 'ch_test', amount: 5000 }),
      expect.any(Object),
    );
  });
});

// ─── createSetupIntent ────────────────────────────────────────────────────────

describe('createSetupIntent', () => {
  it('uses test client in sandbox mode and returns clientSecret', async () => {
    const secret = await stripeConnectService.createSetupIntent('acct_test', 'cus_test', true);

    expect(testInstance.setupIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_test' }),
      expect.objectContaining({ stripeAccount: 'acct_test' }),
    );
    expect(secret).toBe('seti_test_secret');
  });

  it('uses live client in production mode', async () => {
    await stripeConnectService.createSetupIntent('acct_live', 'cus_live', false);

    expect(liveInstance.setupIntents.create).toHaveBeenCalled();
    expect(testInstance.setupIntents.create).not.toHaveBeenCalled();
  });
});

// ─── getAccountStatus ─────────────────────────────────────────────────────────

describe('getAccountStatus', () => {
  it('returns chargesEnabled and detailsSubmitted from Stripe', async () => {
    const status = await stripeConnectService.getAccountStatus('acct_test', true);

    expect(status).toEqual({ chargesEnabled: true, detailsSubmitted: true });
  });
});
