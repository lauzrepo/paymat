export interface Family {
  id: string;
  organizationId: string;
  name: string;
  billingEmail: string | null;
  stripeCustomerId: string | null;
  stripeDefaultPaymentMethodId: string | null;
  createdAt: string;
  contacts?: { id: string; firstName: string; lastName: string; status: string }[];
}
