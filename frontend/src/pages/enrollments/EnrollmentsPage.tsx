import { BookOpen, Calendar } from 'lucide-react';
import { useMyEnrollments } from '../../hooks/useClient';

const FREQ_LABEL: Record<string, string> = {
  monthly: '/mo',
  weekly: '/wk',
  yearly: '/yr',
  one_time: ' one-time',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export function EnrollmentsPage() {
  const { data: enrollments, isLoading } = useMyEnrollments();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Enrollments</h1>

      {isLoading && <div className="text-sm text-gray-400">Loading...</div>}

      {!isLoading && !enrollments?.length && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <BookOpen className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">You are not enrolled in any programs yet.</p>
        </div>
      )}

      {enrollments?.map((enrollment) => (
        <div key={enrollment.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{enrollment.program.name}</h2>
              {enrollment.program.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{enrollment.program.description}</p>
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[enrollment.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
            </span>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              ${Number(enrollment.program.price).toFixed(2)}{FREQ_LABEL[enrollment.program.billingFrequency] ?? ''}
            </span>
            {enrollment.nextBillingDate && (
              <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
                Next billing: {new Date(enrollment.nextBillingDate).toLocaleDateString()}
              </span>
            )}
            <span className="text-gray-400 dark:text-gray-500">
              Since {new Date(enrollment.startDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
