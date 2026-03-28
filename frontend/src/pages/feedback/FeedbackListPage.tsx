import { Link } from 'react-router-dom';
import { Plus, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getMyFeedback } from '../../api/feedback';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/utils';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

export function FeedbackListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-feedback'],
    queryFn: getMyFeedback,
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Feedback & Issues</h1>
        <Link to="/feedback/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> New submission
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
            <MessageSquare className="h-8 w-8" />
            <p className="text-sm">No submissions yet.</p>
            <Link to="/feedback/new" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Submit your first one →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Subject</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{s.subject}</td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{s.type}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
