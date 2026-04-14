import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useEnrollments, useEnroll, useUnenroll, useDeleteEnrollment, usePauseEnrollment, useResumeEnrollment } from '../../hooks/useEnrollments';
import { useContacts } from '../../hooks/useContacts';
import { usePrograms } from '../../hooks/usePrograms';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Link } from 'react-router-dom';

const STATUS_VARIANT: Record<string, 'green' | 'yellow' | 'gray'> = {
  active: 'green', paused: 'yellow', cancelled: 'gray',
};

export function EnrollmentsPage() {
  const [status, setStatus] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ contactId: '', programId: '', startDate: new Date().toISOString().split('T')[0] });

  const enrollments = useEnrollments({ status: status || undefined });
  const contacts = useContacts({ status: 'active', limit: 100 } as Parameters<typeof useContacts>[0]);
  const programs = usePrograms({ activeOnly: true });
  const enroll = useEnroll();
  const unenroll = useUnenroll();
  const deleteEnrollment = useDeleteEnrollment();
  const pause = usePauseEnrollment();
  const resume = useResumeEnrollment();

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    await enroll.mutateAsync({ contactId: form.contactId, programId: form.programId, startDate: form.startDate });
    setShowForm(false);
    setForm({ contactId: '', programId: '', startDate: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Enrollments</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Enroll
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New Enrollment</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleEnroll} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact</label>
                <select
                  value={form.contactId}
                  onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                  required
                  className="appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select contact…</option>
                  {contacts.data?.items.map((c) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Program</label>
                <select
                  value={form.programId}
                  onChange={(e) => setForm({ ...form, programId: e.target.value })}
                  required
                  className="appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select program…</option>
                  {programs.data?.items.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}/{p.billingFrequency}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                  className="appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="sm:col-span-3 flex gap-3 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={enroll.isPending}>Enroll</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">{enrollments.data?.total ?? 0} enrollments</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {enrollments.isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !enrollments.data?.items.length ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No enrollments found.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {enrollments.data.items.map((e) => (
                  <div key={e.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Link to={`/contacts/${e.contactId}`} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        {e.contact?.firstName} {e.contact?.lastName}
                      </Link>
                      <Badge variant={STATUS_VARIANT[e.status] ?? 'gray'}>{e.status}</Badge>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      <p>{e.program?.name} · {formatCurrency(e.program?.price ?? 0)}</p>
                      <p>Since {formatDate(e.startDate)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {e.status === 'active' && (
                        <Button variant="ghost" size="sm" onClick={() => pause.mutate(e.id)}>Pause</Button>
                      )}
                      {e.status === 'paused' && (
                        <Button variant="ghost" size="sm" onClick={() => resume.mutate(e.id)}>Resume</Button>
                      )}
                      {e.status !== 'cancelled' && (
                        <Button variant="ghost" size="sm" onClick={() => unenroll.mutate({ id: e.id })}>Unenroll</Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700"
                        onClick={() => { if (window.confirm('Permanently delete this enrollment?')) deleteEnrollment.mutate(e.id); }}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Contact</th>
                      <th className="px-6 py-3 text-left">Program</th>
                      <th className="px-6 py-3 text-left">Price</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Since</th>
                      <th className="px-6 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {enrollments.data.items.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-6 py-3 font-medium">
                          <Link to={`/contacts/${e.contactId}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                            {e.contact?.firstName} {e.contact?.lastName}
                          </Link>
                        </td>
                        <td className="px-6 py-3 dark:text-gray-100">{e.program?.name}</td>
                        <td className="px-6 py-3 dark:text-gray-100">{formatCurrency(e.program?.price ?? 0)}</td>
                        <td className="px-6 py-3">
                          <Badge variant={STATUS_VARIANT[e.status] ?? 'gray'}>{e.status}</Badge>
                        </td>
                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{formatDate(e.startDate)}</td>
                        <td className="px-6 py-3">
                          <div className="flex gap-1">
                            {e.status === 'active' && (
                              <Button variant="ghost" size="sm" onClick={() => pause.mutate(e.id)}>Pause</Button>
                            )}
                            {e.status === 'paused' && (
                              <Button variant="ghost" size="sm" onClick={() => resume.mutate(e.id)}>Resume</Button>
                            )}
                            {e.status !== 'cancelled' && (
                              <Button variant="ghost" size="sm" onClick={() => unenroll.mutate({ id: e.id })}>Unenroll</Button>
                            )}
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700"
                              onClick={() => { if (window.confirm('Permanently delete this enrollment?')) deleteEnrollment.mutate(e.id); }}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
