import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useFeedbackSubmission, useUpdateFeedbackStatus } from '../../hooks/useFeedback';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/utils';
import type { FeedbackStatus } from '../../api/feedback';

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

const STATUSES: { value: FeedbackStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export function FeedbackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: submission, isLoading } = useFeedbackSubmission(id!);
  const updateStatus = useUpdateFeedbackStatus();

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!submission) return <p className="text-center text-gray-500 dark:text-gray-400 py-20">Submission not found.</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/feedback" className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{submission.subject}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={STATUS_VARIANTS[submission.status] ?? 'gray'}>
                {submission.status.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-gray-500 dark:text-gray-400">{TYPE_LABELS[submission.type]}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-gray-400">Update status:</label>
              <div className="relative">
                <select
                  value={submission.status}
                  onChange={(e) =>
                    updateStatus.mutate({ id: submission.id, status: e.target.value as FeedbackStatus })
                  }
                  className="appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-sm border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">From</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {submission.contact ? (
                  <Link to={`/contacts/${submission.contact.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    {submission.contact.firstName} {submission.contact.lastName}
                  </Link>
                ) : (
                  submission.name
                )}
              </p>
            </div>
            {submission.email && (
              <div>
                <p className="text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{submission.email}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500 dark:text-gray-400">Submitted</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(submission.createdAt)}</p>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-700" />

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Message</p>
            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{submission.message}</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
