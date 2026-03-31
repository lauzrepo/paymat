import { useState } from 'react';
import { Send, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react';
import { useInviteList, useCreateInvite, useDeleteInvite } from '../../hooks/useInvites';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import type { InviteToken } from '../../api/invites';

function InviteStatusBadge({ invite }: { invite: InviteToken }) {
  if (invite.usedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <CheckCircle className="h-3 w-3" /> Accepted
      </span>
    );
  }
  if (new Date(invite.expiresAt) < new Date()) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
        <XCircle className="h-3 w-3" /> Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

export function InvitesPage() {
  const { data, isLoading } = useInviteList();
  const createInvite = useCreateInvite();
  const deleteInvite = useDeleteInvite();

  const [form, setForm] = useState({ email: '', recipientName: '', orgName: '' });
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSent(false);
    try {
      await createInvite.mutateAsync(form);
      setForm({ email: '', recipientName: '', orgName: '' });
      setSent(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to send invite.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customer Invites</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">Send Onboarding Invite</h2>
          <p className="text-sm text-gray-500 mt-1">The recipient will receive an email with a guided setup link to create their account.</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  required
                  value={form.recipientName}
                  onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={form.orgName}
                  onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Acme Dance Studio"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="jane@acmestudio.com"
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            {sent && (
              <p className="text-green-600 text-sm flex items-center gap-1">
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
          <h2 className="text-base font-semibold text-gray-900">Sent Invites</h2>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
          ) : !data?.items.length ? (
            <div className="p-6 text-center text-gray-400 text-sm">No invites sent yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Business</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Sent</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.items.map((invite) => (
                  <tr key={invite.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{invite.recipientName}</td>
                    <td className="px-6 py-3 text-gray-600">{invite.orgName}</td>
                    <td className="px-6 py-3 text-gray-600">{invite.email}</td>
                    <td className="px-6 py-3"><InviteStatusBadge invite={invite} /></td>
                    <td className="px-6 py-3 text-gray-400">{new Date(invite.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
