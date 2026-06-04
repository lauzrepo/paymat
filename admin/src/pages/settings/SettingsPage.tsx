import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { UserMinus, Send, X, UserPlus } from 'lucide-react';
import { useTenantBranding } from '../../hooks/useTenant';
import { updateOrgSettings } from '../../api/tenant';
import { getTeam, inviteStaff, revokeAccess, resendInvite, cancelInvite } from '../../api/team';
import type { TeamMember, PendingInvite } from '../../api/team';
import { useCurrentUser } from '../../hooks/useAuth';
import { queryClient } from '../../lib/queryClient';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo',
];

type Tab = 'organization' | 'team';

// ── Organization tab ──────────────────────────────────────────────────────────

function OrgTab() {
  const { data: branding, isLoading } = useTenantBranding();
  const [form, setForm] = useState({ name: '', type: '', timezone: '', primaryColor: '', logoUrl: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

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

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Organization</h2>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primaryColor || '#4f46e5'}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="h-9 w-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">{form.primaryColor || '#4f46e5'}</span>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" loading={saving}>Save changes</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

// ── Team tab ──────────────────────────────────────────────────────────────────

function TeamTab() {
  const { data, isLoading, error: fetchError } = useQuery({ queryKey: ['team'], queryFn: getTeam });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const inviteMutation = useMutation({
    mutationFn: () => inviteStaff(inviteEmail.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setInviteEmail('');
      setInviteError('');
      setInviteSuccess('Invite sent.');
      setTimeout(() => setInviteSuccess(''), 4000);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setInviteError(err.response?.data?.message ?? 'Failed to send invite.');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeAccess,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  });

  const resendMutation = useMutation({
    mutationFn: resendInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    if (!inviteEmail.trim()) { setInviteError('Email is required'); return; }
    inviteMutation.mutate();
  };

  const handleRevoke = (member: TeamMember) => {
    if (!window.confirm(`Remove access for ${member.email}? They will no longer be able to sign in.`)) return;
    revokeMutation.mutate(member.id);
  };

  if (isLoading) return null;
  if (fetchError) return <Alert variant="error">Failed to load team.</Alert>;

  return (
    <div className="space-y-6">
      {/* Current team */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Team members</h2>
        </CardHeader>
        <CardBody className="p-0">
          {!data?.members.length ? (
            <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">No team members yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Joined</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.members.map((m) => (
                  <tr key={m.id}>
                    <td className="px-6 py-3 font-medium dark:text-gray-100">
                      {m.firstName || m.lastName ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() : '—'}
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{m.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant={m.role === 'admin' ? 'blue' : 'gray'}>{m.role}</Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{formatDate(m.createdAt)}</td>
                    <td className="px-6 py-3 text-right">
                      {m.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          loading={revokeMutation.isPending && revokeMutation.variables === m.id}
                          onClick={() => handleRevoke(m)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Invite form */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Invite teammate</h2>
        </CardHeader>
        <CardBody>
          {inviteSuccess && <Alert variant="success" className="mb-4">{inviteSuccess}</Alert>}
          {inviteError && <Alert variant="error" className="mb-4">{inviteError}</Alert>}
          <form onSubmit={handleInvite} className="flex gap-3">
            <div className="flex-1">
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <Button type="submit" loading={inviteMutation.isPending}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              Send invite
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Pending invites */}
      {!!data?.pendingInvites.length && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Pending invites</h2>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Sent</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.pendingInvites.map((inv: PendingInvite) => (
                  <tr key={inv.id}>
                    <td className="px-6 py-3 dark:text-gray-100">{inv.email}</td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{formatDate(inv.createdAt)}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={resendMutation.isPending && resendMutation.variables === inv.id}
                          onClick={() => resendMutation.mutate(inv.id)}
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Resend
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          loading={cancelMutation.isPending && cancelMutation.variables === inv.id}
                          onClick={() => cancelMutation.mutate(inv.id)}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const [tab, setTab] = useState<Tab>('organization');

  const tabs = isAdmin ? (['organization', 'team'] as Tab[]) : (['organization'] as Tab[]);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'organization' ? <OrgTab /> : <TeamTab />}
    </div>
  );
}
