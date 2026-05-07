import { useState } from 'react';
import { Send, CheckCircle, Clock, XCircle, Trash2, RefreshCw } from 'lucide-react';
import { useInviteList, useCreateInvite, useResendInvite, useDeleteInvite } from '../../hooks/useInvites';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import type { InviteToken } from '../../api/invites';

function InviteStatusBadge({ invite }: { invite: InviteToken }) {
  if (invite.usedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
        <CheckCircle className="h-3 w-3" /> Accepted
      </span>
    );
  }
  if (new Date(invite.expiresAt) < new Date()) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        <XCircle className="h-3 w-3" /> Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

export function InvitesPage() {
  const { data, isLoading } = useInviteList();
  const createInvite = useCreateInvite();
  const resendInvite = useResendInvite();
  const deleteInvite = useDeleteInvite();

  const [form, setForm] = useState({ email: '', recipientName: '', orgName: '', platformFeePercent: 0.05 });
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [resending, setResending] = useState<string | null>(null); // invite id being resent
  const [resendTier, setResendTier] = useState(0.05);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const handleResend = async (id: string) => {
    try {
      await resendInvite.mutateAsync({ id, platformFeePercent: resendTier });
      setResendSuccess(id);
      setResending(null);
      setTimeout(() => setResendSuccess(null), 3000);
    } catch {
      // error visible via mutation state
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSent(false);
    try {
      await createInvite.mutateAsync(form);
      setForm({ email: '', recipientName: '', orgName: '', platformFeePercent: 0.05 });
      setSent(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to send invite.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Customer Invites</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Send Onboarding Invite</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">The recipient will receive an email with a guided setup link to create their account.</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr] gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Name</label>
                <input
                  type="text"
                  required
                  value={form.recipientName}
                  onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={form.orgName}
                  onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Acme Dance Studio"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="jane@acmestudio.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pricing Tier</label>
                <select
                  value={form.platformFeePercent}
                  onChange={(e) => setForm({ ...form, platformFeePercent: parseFloat(e.target.value) })}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value={0.05}>Founding Member — 0.05% (closes May 31)</option>
                  <option value={1}>Early Adopter — 1%</option>
                  <option value={2}>Standard — 2%</option>
                </select>
                {form.platformFeePercent === 0.05 && (
                  <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                    Founding Member rate closes June 1, 2026. Use Early Adopter (1%) for new invites after that date.
                  </p>
                )}
              </div>
            </div>

            {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
            {sent && (
              <p className="text-green-600 dark:text-green-400 text-sm flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Invite sent successfully.
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" loading={createInvite.isPending}>
                <Send className="h-4 w-4 mr-2" /> Send Invite
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Sent Invites</h2>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">Loading...</div>
          ) : !data?.items.length ? (
            <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">No invites sent yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Business</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sent</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {data.items.map((invite) => (
                  <>
                    <tr key={invite.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-100">{invite.recipientName}</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{invite.orgName}</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{invite.email}</td>
                      <td className="px-6 py-3"><InviteStatusBadge invite={invite} /></td>
                      <td className="px-6 py-3 text-gray-400 dark:text-gray-500">{new Date(invite.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          {!invite.usedAt && (
                            resendSuccess === invite.id ? (
                              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" /> Sent
                              </span>
                            ) : (
                              <button
                                onClick={() => { setResending(invite.id); setResendTier(0.05); }}
                                disabled={resendInvite.isPending}
                                className="text-gray-400 hover:text-violet-500 transition-colors disabled:opacity-50"
                                title="Resend invite"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete the invite for ${invite.recipientName} (${invite.orgName})?`)) {
                                deleteInvite.mutate(invite.id);
                              }
                            }}
                            disabled={deleteInvite.isPending}
                            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Delete invite"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {resending === invite.id && (
                      <tr key={`${invite.id}-resend`} className="bg-violet-50 dark:bg-violet-900/20">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 dark:text-gray-300 shrink-0">Resend as:</span>
                            <select
                              value={resendTier}
                              onChange={(e) => setResendTier(parseFloat(e.target.value))}
                              className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                              <option value={0.05}>Founding Member — 0.05% (closes May 31)</option>
                              <option value={1}>Early Adopter — 1%</option>
                              <option value={2}>Standard — 2%</option>
                            </select>
                            <button
                              onClick={() => handleResend(invite.id)}
                              disabled={resendInvite.isPending}
                              className="text-sm font-medium bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-3 py-1 rounded-lg transition-colors"
                            >
                              {resendInvite.isPending ? 'Sending…' : 'Send'}
                            </button>
                            <button
                              onClick={() => setResending(null)}
                              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
