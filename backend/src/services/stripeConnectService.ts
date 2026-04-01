import Stripe from 'stripe';
import { config } from '../config/environment';
import logger from '../utils/logger';

class StripeConnectService {
  private _client: Stripe | null = null;

  private get client(): Stripe {
    if (!this._client) {
      this._client = new Stripe(config.stripe.secretKey);
    }
    return this._client;
  }

  // ── Account provisioning ────────────────────────────────────────────────

  async createConnectAccount(orgId: string, orgName: string, email: string): Promise<string> {
    const account = await this.client.accounts.create({
      type: 'express',
      email,
      business_profile: { name: orgName },
      metadata: { organizationId: orgId },
    });
    logger.info(`[StripeConnect] created Express account ${account.id} for org ${orgId}`);
    return account.id;
  }

  async createAccountOnboardingLink(connectAccountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
    const link = await this.client.accountLinks.create({
      account: connectAccountId,
      type: 'account_onboarding',
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });
    return link.url;
  }

  async createAccountLoginLink(connectAccountId: string): Promise<string> {
    const link = await this.client.accounts.createLoginLink(connectAccountId);
    return link.url;
  }

  async getAccountStatus(connectAccountId: string): Promise<{ chargesEnabled: boolean; detailsSubmitted: boolean }> {
    const account = await this.client.accounts.retrieve(connectAccountId);
    return {
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }

  // ── Customer management (per connected account) ──────────────────────────

  async createCustomer(connectAccountId: string, email: string, name: string): Promise<string> {
    const customer = await this.client.customers.create(
      { email, name },
      { stripeAccount: connectAccountId }
    );
    logger.info(`[StripeConnect] created customer ${customer.id} on account ${connectAccountId}`);
    return customer.id;
  }

  // ── Payment intents ──────────────────────────────────────────────────────

  /** Create a PaymentIntent for portal self-serve payment (returns clientSecret to frontend). */
  async createPaymentIntent(
    connectAccountId: string,
    amountCents: number,
    currency: string,
    customerId: string | null,
    metadata: Record<string, string> = {}
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata,
      ...(customerId && { customer: customerId }),
    };

    const appFee = config.stripe.applicationFeePercent > 0
      ? Math.round(amountCents * (config.stripe.applicationFeePercent / 100))
      : undefined;
    if (appFee) params.application_fee_amount = appFee;

    const intent = await this.client.paymentIntents.create(params, { stripeAccount: connectAccountId });
    logger.info(`[StripeConnect] created PaymentIntent ${intent.id} on account ${connectAccountId}`);
    return { clientSecret: intent.client_secret!, paymentIntentId: intent.id };
  }

  /** Auto-charge a saved card (off-session) for recurring billing. */
  async chargeCustomer(opts: {
    connectAccountId: string;
    customerId: string;
    paymentMethodId: string;
    amountCents: number;
    currency: string;
    description: string;
    idempotencyKey: string;
    metadata?: Record<string, string>;
  }): Promise<{ paymentIntentId: string; chargeId: string; status: string }> {
    const { connectAccountId, customerId, paymentMethodId, amountCents, currency, description, idempotencyKey, metadata } = opts;

    const appFee = config.stripe.applicationFeePercent > 0
      ? Math.round(amountCents * (config.stripe.applicationFeePercent / 100))
      : undefined;

    const intent = await this.client.paymentIntents.create(
      {
        amount: amountCents,
        currency: currency.toLowerCase(),
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description,
        metadata: metadata ?? {},
        ...(appFee && { application_fee_amount: appFee }),
      },
      {
        stripeAccount: connectAccountId,
        idempotencyKey,
      }
    );

    const chargeId = typeof intent.latest_charge === 'string'
      ? intent.latest_charge
      : (intent.latest_charge as Stripe.Charge | null)?.id ?? '';

    logger.info(`[StripeConnect] charged ${amountCents} on account ${connectAccountId} — intent ${intent.id}`);
    return {
      paymentIntentId: intent.id,
      chargeId,
      status: intent.status === 'succeeded' ? 'succeeded' : 'failed',
    };
  }

  // ── Refunds ──────────────────────────────────────────────────────────────

  async refundCharge(connectAccountId: string, chargeId: string, amountCents?: number): Promise<void> {
    await this.client.refunds.create(
      { charge: chargeId, ...(amountCents !== undefined && { amount: amountCents }) },
      { stripeAccount: connectAccountId }
    );
    logger.info(`[StripeConnect] refunded charge ${chargeId} on account ${connectAccountId}`);
  }

  // ── Setup intents (save card without charging) ───────────────────────────

  async createSetupIntent(connectAccountId: string, customerId: string): Promise<string> {
    const setup = await this.client.setupIntents.create(
      { customer: customerId, automatic_payment_methods: { enabled: true } },
      { stripeAccount: connectAccountId }
    );
    return setup.client_secret!;
  }

  // ── Webhooks ─────────────────────────────────────────────────────────────

  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): Stripe.Event {
    return this.client.webhooks.constructEvent(rawBody, signature, secret);
  }
}

export default new StripeConnectService();
