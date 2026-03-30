import Stripe from 'stripe';
import { config } from '../config/environment';

const stripe = new Stripe(config.stripe.secretKey);

class StripeService {
  // Get or create a Stripe customer for an organization
  async getOrCreateCustomer(orgId: string, orgName: string, email: string): Promise<string> {
    const customer = await stripe.customers.create({
      name: orgName,
      email,
      metadata: { organizationId: orgId },
    });
    return customer.id;
  }

  // Create a checkout session to start a subscription
  async createCheckoutSession(customerId: string, orgId: string, successUrl: string, cancelUrl: string) {
    const session = await stripe.checkout.sessions.create({
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
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session;
  }

  // Verify and construct a Stripe webhook event from raw body
  constructWebhookEvent(rawBody: Buffer, signature: string) {
    return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  }
}

export default new StripeService();
