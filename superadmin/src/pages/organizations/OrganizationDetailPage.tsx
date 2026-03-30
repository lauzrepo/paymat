import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, CreditCard, ExternalLink } from 'lucide-react';
import { useOrganization, useUpdateOrganization, useSetOrganizationActive } from '../../hooks/useOrganizations';
import { sendBillingCheckout, getBillingPortalLink } from '../../api/organizations';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate, formatCurrency } from '../../lib/utils';

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'Europe/London',
  'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney',
];

const ORG_TYPES = ['general', 'studio', 'gym', 'school', 'clinic', 'other'];

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: org, isLoading } = useOrganization(id!);
  const update = useUpdateOrganization(id!);
  const setActive = useSetOrganizationActive();

  const [editing, setEditing] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingMsg, setBillingMsg] = useState('');

  const handleSendCheckout = async () => {
    if (!org) return;
    setBillingLoading(true);
    setBillingMsg('');
    try {
      const { url } = await sendBillingCheckout(org.id);
      await navigator.clipboard.writeText(url);
      setBillingMsg('Checkout link copied to clipboard.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setBillingMsg(msg ?? 'Failed to generate checkout link.');
    } finally {
      setBillingLoading(false);
    }
  };

  const handlePortalLink = async () => {
    if (!org) return;
    setBillingLoading(true);
    setBillingMsg('');
    try {
      const { url } = await getBillingPortalLink(org.id);
      window.open(url, '_blank');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setBillingMsg(msg ?? 'Failed to open billing portal.');
    } finally {
      setBillingLoading(false);
    }
  };
  const [form, setForm] = useState({ name: '', slug: '', type: '', timezone: '', primaryColor: '' });
  const [saveError, setSaveError] = useState('');

  const startEdit = () => {
    if (!org) return;
    setForm({ name: org.name, slug: org.slug, type: org.type, timezone: org.timezone, primaryColor: org.primaryColor ?? '' });
    setSaveError('');
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    try {
      await update.mutateAsync(form);
      setEditing(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save changes.');
    }
  };

  const handleToggleActive = async () => {
    if (!org) return;
    const action = org.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this organization?`)) return;
    await setActive.mutateAsync({ id: org.id, active: !org.isActive });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!org) return <p className="text-center py-20 text-gray-500">Organization not found.</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
        <Badge variant={org.isActive ? 'green' : 'red'}>{org.isActive ? 'Active' : 'Inactive'}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Contacts', value: org._count?.contacts ?? 0 },
          { label: 'Families', value: org._count?.families ?? 0 },
          { label: 'Programs', value: org._count?.programs ?? 0 },
          { label: 'Invoices', value: org._count?.invoices ?? 0 },
          { label: 'Revenue', value: formatCurrency(org.stats?.totalRevenue ?? 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Settings</h2>
            {!editing && <Button variant="secondary" size="sm" onClick={startEdit}>Edit</Button>}
          </CardHeader>
          <CardBody>
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text" required value={form.slug} pattern="[a-z0-9-]+"
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {ORG_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <select
                      value={form.timezone}
                      onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                      className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color" value={form.primaryColor || '#4f46e5'}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="h-9 w-16 rounded border border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm text-gray-500 font-mono">{form.primaryColor || '#4f46e5'}</span>
                  </div>
                </div>
                {saveError && <p className="text-red-600 text-sm">{saveError}</p>}
                <div className="flex gap-2 justify-end pt-1">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type="submit" size="sm" loading={update.isPending}>Save</Button>
                </div>
              </form>
            ) : (
              <dl className="space-y-3 text-sm">
                {[
                  { label: 'Slug', value: org.slug, mono: true },
                  { label: 'Type', value: org.type },
                  { label: 'Timezone', value: org.timezone },
                  { label: 'Created', value: formatDate(org.createdAt) },
                  { label: 'Updated', value: formatDate(org.updatedAt) },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex justify-between">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className={`font-medium text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
                  </div>
                ))}
                {org.primaryColor && (
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Primary color</dt>
                    <dd className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border border-gray-200 inline-block" style={{ backgroundColor: org.primaryColor }} />
                      <span className="font-mono text-xs text-gray-900">{org.primaryColor}</span>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </CardBody>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-gray-900">Users ({org._count?.users ?? 0})</h2></CardHeader>
          <CardBody className="p-0">
            {!org.users?.length ? (
              <p className="px-6 py-6 text-sm text-gray-500">No users.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {org.users.map((u) => (
                  <li key={u.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {u.firstName || u.lastName ? `${u.firstName} ${u.lastName}`.trim() : '—'}
                      </p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <Badge variant={u.role === 'admin' ? 'blue' : 'gray'}>{u.role}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Billing */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Platform Billing</h2>
        </CardHeader>
        <CardBody className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-700">
              Status: <span className={`font-semibold ${
                org.subscriptionStatus === 'active' ? 'text-green-600' :
                org.subscriptionStatus === 'past_due' ? 'text-orange-600' :
                org.subscriptionStatus === 'canceled' ? 'text-red-600' :
                'text-gray-500'
              }`}>
                {org.subscriptionStatus ?? 'inactive'}
              </span>
            </p>
            {billingMsg && <p className="text-xs text-gray-500 mt-1">{billingMsg}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {org.subscriptionStatus !== 'active' && (
              <Button size="sm" loading={billingLoading} onClick={handleSendCheckout}>
                Copy checkout link
              </Button>
            )}
            {org.stripeCustomerId && (
              <Button size="sm" variant="secondary" loading={billingLoading} onClick={handlePortalLink}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Billing portal
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader><h2 className="text-base font-semibold text-gray-900">Danger Zone</h2></CardHeader>
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {org.isActive ? 'Deactivate organization' : 'Activate organization'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {org.isActive
                ? 'Prevents all users from logging in. Data is preserved.'
                : 'Re-enables login for all users in this organization.'}
            </p>
          </div>
          <Button
            variant={org.isActive ? 'danger' : 'secondary'}
            size="sm"
            loading={setActive.isPending}
            onClick={handleToggleActive}
          >
            {org.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
