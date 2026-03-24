export interface Enrollment {
  id: string;
  contactId: string;
  programId: string;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  contact?: { id: string; firstName: string; lastName: string; email: string | null };
  program?: { id: string; name: string; price: number; billingFrequency: string };
}
