import { useState, useEffect } from 'react';
import { useTenantBranding } from '../../hooks/useTenant';
import { updateOrgSettings } from '../../api/tenant';
import { queryClient } from '../../lib/queryClient';
import { useRunBilling } from '../../hooks/useBilling';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo',
];

export function SettingsPage() {
  const { data: branding, isLoading } = useTenantBranding();
  const [form, setForm] = useState({ name: '', type: '', timezone: '', primaryColor: '', logoUrl: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [billingResult, setBillingResult] = useState<string | null>(null);
  const runBilling = useRunBilling();

  useEffect(() => {
    if (branding) {
      setForm({
        name: branding.name ?? '',
        type: branding.type ?? '',
        timezone: branding.timezone ?? '',
        primaryColor: branding.primaryColor ?? '',
        logoUrl: branding.logoUrl ?? '',
      });
    }
  }, [branding]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateOrgSettings(form);
      queryClient.invalidateQueries({ queryKey: ['tenantBranding'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunBilling = async () => {
    setBillingResult(null);
    try {
      const result = await runBilling.mutateAsync();
      const activeNote = result.activeEnrollments !== undefined ? ` (${result.activeEnrollments} active enrollment(s) found)` : '';
      setBillingResult(`Done — ${result.invoicesCreated} invoice(s) created, ${result.autoCharged} auto-charged, ${result.errors} error(s).${activeNote}`);
    } catch {
      setBillingResult('Billing run failed. Check the server logs.');
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">Organization</h2>
        </CardHeader>
        <CardBody>
          {saved && <Alert variant="success" className="mb-4">Settings saved.</Alert>}
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Organization name"
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="general">General</option>
                <option value="gym">Gym / Fitness</option>
                <option value="studio">Dance / Yoga Studio</option>
                <option value="school">Martial Arts School</option>
                <option value="music">Music School</option>
                <option value="sports">Youth Sports</option>
                <option value="tutoring">Tutoring Center</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <Input
              label="Logo URL"
              id="logoUrl"
              type="url"
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://…"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primaryColor || '#4f46e5'}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-500">{form.primaryColor || '#4f46e5'}</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" loading={saving}>Save changes</Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">Recurring Billing</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-gray-600">
            Generate invoices for all active enrollments that are due today or overdue, and attempt auto-charge for contacts with a saved card.
            This runs automatically each night via cron. Use the button below to trigger it manually.
          </p>
          {billingResult && (
            <Alert variant={billingResult.includes('failed') ? 'error' : 'success'}>{billingResult}</Alert>
          )}
          <div>
            <Button onClick={handleRunBilling} loading={runBilling.isPending} variant="secondary">
              Run billing now
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
