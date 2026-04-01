import { Link } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';
import { useMyInvoices } from '../../hooks/useClient';
import { useOrgSlug } from '../../context/OrgSlugContext';

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-400',
};

export function InvoicesPage() {
  const { data, isLoading } = useMyInvoices();
  const orgSlug = useOrgSlug();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>

      {isLoading && <div className="text-sm text-gray-400">Loading...</div>}

      {!isLoading && !data?.invoices.length && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No invoices yet.</p>
        </div>
      )}

      {data?.invoices.map((invoice) => {
        const outstanding = Number(invoice.amountDue) - Number(invoice.amountPaid);
        const canPay = ['draft', 'sent', 'overdue'].includes(invoice.status) && outstanding > 0;

        return (
          <Link
            key={invoice.id}
            to={`/${orgSlug}/invoices/${invoice.id}`}
            className="block bg-white rounded-xl border border-gray-200 hover:border-indigo-200 hover:shadow-sm transition-all"
          >
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Due {new Date(invoice.dueDate).toLocaleDateString()}
                    {invoice.notes && ` · ${invoice.notes}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    ${Number(invoice.amountDue).toFixed(2)}
                  </p>
                  {canPay && outstanding < Number(invoice.amountDue) && (
                    <p className="text-xs text-orange-600">
                      ${outstanding.toFixed(2)} remaining
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[invoice.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
