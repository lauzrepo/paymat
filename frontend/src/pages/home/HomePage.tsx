import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useMe } from '../../hooks/useAuth';

export function HomePage() {
  const { data: user } = useMe();
  const firstName = user?.firstName ?? 'there';

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hi, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome to your member portal.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Have a question or issue?</p>
          <p className="text-sm text-gray-500 mt-0.5">
            Submit feedback or report a problem and we'll get back to you.
          </p>
          <Link
            to="/feedback/new"
            className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Submit feedback →
          </Link>
        </div>
      </div>
    </div>
  );
}
