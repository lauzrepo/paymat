import Stripe from 'stripe';
import { config } from '../config/environment';

class StripeService {
  private _client: Stripe | null = null;

  private get client(): Stripe {
    if (!this._client) {
      if (!config.stripe.secretKey) throw new Error('Stripe is not configured');
      this._client = new Stripe(config.stripe.secretKey);
    }
    return this._client;
  }

  // Get or create a Stripe customer for an organization
  async getOrCreateCustomer(orgId: string, orgName: string, email: string): Promise<string> {
    const customer = await this.client.customers.create({
      name: orgName,
      email,
      metadata: { organizationId: orgId },
    });
    return customer.id;
  }

  // Create a checkout session to start a subscription
  async createCheckoutSession(customerId: string, orgId: string, successUrl: string, cancelUrl: string) {
    const session = await this.client.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: config.stripe.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { organizationId: orgId },
      subscription_data: { metadata: { organizationId: orgId } },
    });
    return session;
  }

  // Create a customer portal session for self-serve billing management
  async createPortalSession(customerId: string, returnUrl: string) {
    const session = await this.client.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session;
  }

  // Verify and construct a Stripe webhook event from raw body
  constructWebhookEvent(rawBody: Buffer, signature: string) {
    return this.client.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  }
}

export default new StripeService();
