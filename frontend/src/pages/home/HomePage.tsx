import { Link } from 'react-router-dom';
import { BookOpen, FileText, CreditCard, MessageSquare } from 'lucide-react';
import { useMe } from '../../hooks/useAuth';
import { useMyEnrollments, useMyInvoices } from '../../hooks/useClient';
import { useOrgSlug } from '../../context/OrgSlugContext';

export function HomePage() {
  const { data: user } = useMe();
  const { data: enrollments } = useMyEnrollments();
  const { data: invoicesData } = useMyInvoices();
  const orgSlug = useOrgSlug();

  const firstName = user?.firstName ?? 'there';
  const activeEnrollments = enrollments?.filter((e) => e.status === 'active').length ?? 0;
  const overdueInvoices = invoicesData?.invoices.filter((i) => i.status === 'overdue') ?? [];
  const openInvoices = invoicesData?.invoices.filter((i) => ['draft', 'sent', 'overdue'].includes(i.status)) ?? [];
  const totalOwed = openInvoices.reduce((sum, i) => sum + (Number(i.amountDue) - Number(i.amountPaid)), 0);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Hi, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Welcome to your member portal.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to={`/${orgSlug}/enrollments`} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Programs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeEnrollments}</p>
        </Link>

        <Link to={`/${orgSlug}/invoices`} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${overdueInvoices.length ? 'bg-red-50' : 'bg-gray-50'}`}>
              <FileText className={`h-4 w-4 ${overdueInvoices.length ? 'text-red-600' : 'text-gray-500'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Balance Due</span>
          </div>
          <p className={`text-2xl font-bold ${totalOwed > 0 ? 'text-orange-600' : 'text-gray-900 dark:text-gray-100'}`}>
            ${totalOwed.toFixed(2)}
          </p>
          {overdueInvoices.length > 0 && (
            <p className="text-xs text-red-600 mt-1">{overdueInvoices.length} overdue</p>
          )}
        </Link>
      </div>

      {overdueInvoices.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-800 mb-2">
            You have {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''}.
          </p>
          <Link
            to={`/${orgSlug}/invoices`}
            className="text-sm font-medium text-red-700 underline hover:text-red-900"
          >
            View and pay now →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Link to={`/${orgSlug}/invoices`} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3 hover:border-indigo-200 hover:shadow-sm transition-all">
          <CreditCard className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Pay an invoice</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">View and pay your outstanding balances.</p>
          </div>
        </Link>

        <Link to={`/${orgSlug}/feedback/new`} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3 hover:border-indigo-200 hover:shadow-sm transition-all">
          <MessageSquare className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Get support</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Report an issue or send feedback.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
