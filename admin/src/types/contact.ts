export interface Contact {
  id: string;
  organizationId: string;
  familyId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  helcimToken: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  family?: { id: string; name: string } | null;
  enrollments?: ContactEnrollment[];
}

export interface ContactEnrollment {
  id: string;
  status: string;
  startDate: string;
  program: { id: string; name: string; price: number; billingFrequency: string };
}
