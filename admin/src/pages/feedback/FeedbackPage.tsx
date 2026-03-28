import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MessageSquare } from 'lucide-react';
import { useFeedbackList, useCreateFeedback } from '../../hooks/useFeedback';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/utils';
import type { FeedbackType } from '../../api/feedback';

const STATUS_VARIANTS: Record<string, 'gray' | 'blue' | 'green' | 'yellow'> = {
  open: 'blue',
  in_progress: 'yellow',
  resolved: 'green',
  closed: 'gray',
};

const TYPE_LABELS: Record<string, string> = {
  feedback: 'Feedback',
  bug: 'Bug Report',
  question: 'Question',
};

const EMPTY_FORM = { name: '', email: '', type: 'feedback' as FeedbackType, subject: '', message: '' };

export function FeedbackPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const list = useFeedbackList({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  });
  const create = useCreateFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync(form);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Feedback & Issues</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Submit Feedback
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">New Submission</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Name"
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Input
                  label="Email (optional)"
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as FeedbackType })}
                  className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="feedback">Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="question">Question</option>
                </select>
              </div>
              <Input
                label="Subject"
                id="subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  required
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
                  Cancel
                </Button>
                <Button type="submit" loading={create.isPending}>Submit</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none bg-white text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All types</option>
              <option value="feedback">Feedback</option>
              <option value="bug">Bug Report</option>
              <option value="question">Question</option>
            </select>
            <span className="text-sm text-gray-500 ml-auto">{list.data?.total ?? 0} submissions</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {list.isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !list.data?.items.length ? (
            <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
              <MessageSquare className="h-8 w-8" />
              <p className="text-sm">No submissions yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Subject</th>
                  <th className="px-6 py-3 text-left">From</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.data.items.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">
                      <Link to={`/feedback/${s.id}`} className="text-indigo-600 hover:underline">
                        {s.subject}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {s.contact
                        ? <Link to={`/contacts/${s.contact.id}`} className="hover:underline">{s.contact.firstName} {s.contact.lastName}</Link>
                        : s.name}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{TYPE_LABELS[s.type]}</td>
                    <td className="px-6 py-3">
                      <Badge variant={STATUS_VARIANTS[s.status] ?? 'gray'}>
                        {s.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{formatDate(s.createdAt)}</td>
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
