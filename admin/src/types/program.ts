export interface Program {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  price: number;
  billingFrequency: string;
  capacity: number | null;
  maxBillingCycles: number | null;
  isActive: boolean;
  createdAt: string;
  _count?: { enrollments: number };
}
