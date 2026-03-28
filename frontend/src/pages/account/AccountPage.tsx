import { User, Phone, Calendar, Users } from 'lucide-react';
import { useClientMe } from '../../hooks/useClient';

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value ?? <span className="text-gray-400 italic">Not set</span>}</dd>
    </div>
  );
}

export function AccountPage() {
  const { data, isLoading } = useClientMe();

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading...</div>;
  }

  const contact = data?.contact;

  const dob = contact?.dateOfBirth
    ? new Date(contact.dateOfBirth).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">My Account</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <User className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-700">Profile</h2>
        </div>
        <dl className="px-5 py-4 grid grid-cols-2 gap-4">
          <Field label="First Name" value={data?.firstName ?? contact?.firstName} />
          <Field label="Last Name" value={data?.lastName ?? contact?.lastName} />
          <Field label="Email" value={data?.email} />
          <Field label="Role" value={data ? 'Member' : undefined} />
        </dl>
      </div>

      {contact && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Phone className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-700">Contact Info</h2>
          </div>
          <dl className="px-5 py-4 grid grid-cols-2 gap-4">
            <Field label="Phone" value={contact.phone} />
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date of Birth</dt>
                <dd className="mt-1 text-sm text-gray-900">{dob ?? <span className="text-gray-400 italic">Not set</span>}</dd>
              </div>
            </div>
          </dl>
        </div>
      )}

      {contact?.family && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-700">Family</h2>
          </div>
          <dl className="px-5 py-4 grid grid-cols-2 gap-4">
            <Field label="Family Name" value={contact.family.name} />
            <Field label="Billing Email" value={contact.family.billingEmail} />
          </dl>
        </div>
      )}
    </div>
  );
}
