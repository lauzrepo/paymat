export interface OrgUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  type: string;
  timezone: string;
  logoUrl: string | null;
  primaryColor: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    contacts: number;
    families: number;
    programs: number;
    invoices: number;
    payments: number;
    users: number;
  };
  users?: OrgUser[];
  stats?: {
    totalRevenue: number;
  };
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string;
  stripeConnectAccountId?: string | null;
  stripeConnectOnboardingComplete?: boolean;
  sandboxMode?: boolean;
}
