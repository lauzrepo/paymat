import Stripe from 'stripe';
import { config } from '../config/environment';
import logger from '../utils/logger';

class StripeConnectService {
  private _testClient: Stripe | null = null;
  private _liveClient: Stripe | null = null;

  private getClient(sandboxMode: boolean): Stripe {
    if (sandboxMode) {
      if (!this._testClient) this._testClient = new Stripe(config.stripe.secretKey);
      return this._testClient;
    } else {
      if (!this._liveClient) this._liveClient = new Stripe(config.stripe.secretKeyLive);
      return this._liveClient;
    }
  }

  getPublishableKey(sandboxMode: boolean): string {
    return sandboxMode ? config.stripe.publishableKey : config.stripe.publishableKeyLive;
  }

  // ── Account provisioning ────────────────────────────────────────────────

  async createConnectAccount(orgId: string, orgName: string, email: string, sandboxMode = true): Promise<string> {
    const account = await this.getClient(sandboxMode).accounts.create({
      type: 'express',
      email,
      business_profile: { name: orgName },
      metadata: { organizationId: orgId },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    logger.info(`[StripeConnect] created Express account ${account.id} for org ${orgId} (sandbox=${sandboxMode})`);
    return account.id;
  }

  async createAccountOnboardingLink(connectAccountId: string, returnUrl: string, refreshUrl: string, sandboxMode = true): Promise<string> {
    const link = await this.getClient(sandboxMode).accountLinks.create({
      account: connectAccountId,
      type: 'account_onboarding',
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });
    return link.url;
  }

  async createAccountLoginLink(connectAccountId: string, sandboxMode = true): Promise<string> {
    const link = await this.getClient(sandboxMode).accounts.createLoginLink(connectAccountId);
    return link.url;
  }

  async getAccountStatus(connectAccountId: string, sandboxMode = true): Promise<{ chargesEnabled: boolean; detailsSubmitted: boolean }> {
    const account = await this.getClient(sandboxMode).accounts.retrieve(connectAccountId);
    return {
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }

  // ── Customer management (per connected account) ──────────────────────────

  async createCustomer(connectAccountId: string, email: string | undefined, name: string, sandboxMode = true): Promise<string> {
    const customer = await this.getClient(sandboxMode).customers.create(
      { ...(email ? { email } : {}), name },
      { stripeAccount: connectAccountId }
    );
    logger.info(`[StripeConnect] created customer ${customer.id} on account ${connectAccountId}`);
    return customer.id;
  }

  // ── Payment intents ──────────────────────────────────────────────────────

  async createPaymentIntent(
    connectAccountId: string,
    amountCents: number,
    currency: string,
    customerId: string | null,
    metadata: Record<string, string> = {},
    feePercent?: number,
    sandboxMode = true
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata,
      ...(customerId && { customer: customerId }),
    };

    const rate = feePercent ?? config.stripe.applicationFeePercent;
    const appFee = rate > 0 ? Math.round(amountCents * (rate / 100)) : undefined;
    if (appFee) params.application_fee_amount = appFee;

    const intent = await this.getClient(sandboxMode).paymentIntents.create(params, { stripeAccount: connectAccountId });
    logger.info(`[StripeConnect] created PaymentIntent ${intent.id} on account ${connectAccountId}`);
    return { clientSecret: intent.client_secret!, paymentIntentId: intent.id };
  }

  async chargeCustomer(opts: {
    connectAccountId: string;
    customerId: string;
    paymentMethodId: string;
    amountCents: number;
    currency: string;
    description: string;
    idempotencyKey: string;
    metadata?: Record<string, string>;
    feePercent?: number;
    sandboxMode?: boolean;
  }): Promise<{ paymentIntentId: string; chargeId: string; status: string }> {
    const { connectAccountId, customerId, paymentMethodId, amountCents, currency, description, idempotencyKey, metadata, feePercent, sandboxMode = true } = opts;

    const rate = feePercent ?? config.stripe.applicationFeePercent;
    const appFee = rate > 0 ? Math.round(amountCents * (rate / 100)) : undefined;

    const intent = await this.getClient(sandboxMode).paymentIntents.create(
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
      { stripeAccount: connectAccountId, idempotencyKey }
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

  async refundCharge(connectAccountId: string, chargeId: string, amountCents?: number, sandboxMode = true): Promise<void> {
    await this.getClient(sandboxMode).refunds.create(
      { charge: chargeId, ...(amountCents !== undefined && { amount: amountCents }) },
      { stripeAccount: connectAccountId }
    );
    logger.info(`[StripeConnect] refunded charge ${chargeId} on account ${connectAccountId}`);
  }

  // ── Setup intents (save card without charging) ───────────────────────────

  async createSetupIntent(connectAccountId: string, customerId: string, sandboxMode = true): Promise<string> {
    const setup = await this.getClient(sandboxMode).setupIntents.create(
      { customer: customerId, automatic_payment_methods: { enabled: true } },
      { stripeAccount: connectAccountId }
    );
    return setup.client_secret!;
  }

  // ── Payment intent retrieval ─────────────────────────────────────────────

  async retrievePaymentIntent(connectAccountId: string, paymentIntentId: string, sandboxMode = true): Promise<Stripe.PaymentIntent> {
    return this.getClient(sandboxMode).paymentIntents.retrieve(paymentIntentId, {}, { stripeAccount: connectAccountId });
  }

  // ── Charge fee breakdown ─────────────────────────────────────────────────
  // Returns exact Stripe processing fee and net payout from the connected
  // account's balance transaction. Returns null if unavailable.

  async getChargeFees(chargeId: string, connectAccountId: string, sandboxMode = true): Promise<{
    stripeFee: number;
    net: number;
  } | null> {
    try {
      const charge = await this.getClient(sandboxMode).charges.retrieve(
        chargeId,
        { expand: ['balance_transaction'] },
        { stripeAccount: connectAccountId }
      );
      const bt = charge.balance_transaction;
      if (!bt || typeof bt === 'string') return null;
      return {
        stripeFee: bt.fee / 100,
        net: bt.net / 100,
      };
    } catch (err) {
      logger.warn(`[StripeConnect] could not retrieve charge fees for ${chargeId}: ${(err as Error).message}`);
      return null;
    }
  }

  // ── Webhooks ─────────────────────────────────────────────────────────────

  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): Stripe.Event {
    // Try test client first; webhook construction doesn't depend on mode
    return this._testClient
      ? this._testClient.webhooks.constructEvent(rawBody, signature, secret)
      : new Stripe(config.stripe.secretKey).webhooks.constructEvent(rawBody, signature, secret);
  }
}

export default new StripeConnectService();
