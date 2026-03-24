export interface Family {
  id: string;
  organizationId: string;
  name: string;
  billingEmail: string | null;
  createdAt: string;
  contacts?: { id: string; firstName: string; lastName: string; status: string }[];
}
