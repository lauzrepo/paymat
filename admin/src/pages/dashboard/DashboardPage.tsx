import { Users, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { useInvoiceStats } from '../../hooks/useInvoices';
import { usePaymentStats } from '../../hooks/usePayments';
import { useContacts } from '../../hooks/useContacts';
import { useInvoices } from '../../hooks/useInvoices';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Link } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
  paid: 'green',
  overdue: 'red',
  draft: 'gray',
  sent: 'blue',
  void: 'gray',
};

export function DashboardPage() {
  const invoiceStats = useInvoiceStats();
  const paymentStats = usePaymentStats();
  const contacts = useContacts({ status: 'active' });
  const overdueInvoices = useInvoices({ status: 'overdue' });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Members"
          value={contacts.data?.total ?? '—'}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Revenue This Month"
          value={formatCurrency(paymentStats.data?.totalAmount ?? 0)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Overdue Invoices"
          value={invoiceStats.data?.overdue ?? '—'}
          icon={<AlertCircle className="h-5 w-5" />}
        />
        <StatCard
          label="Total Collected"
          value={formatCurrency(invoiceStats.data?.totalAmountPaid ?? 0)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Overdue Invoices</h2>
              <Link to="/invoices?status=overdue" className="text-sm text-indigo-600 hover:text-indigo-500">
                View all
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {overdueInvoices.isLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : !overdueInvoices.data?.items.length ? (
                <p className="px-6 py-8 text-center text-sm text-gray-500">No overdue invoices.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Invoice</th>
                      <th className="px-6 py-3 text-left">Billed to</th>
                      <th className="px-6 py-3 text-left">Amount</th>
                      <th className="px-6 py-3 text-left">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {overdueInvoices.data.items.map((inv) => (
                      <tr key={inv.id}>
                        <td className="px-6 py-3">
                          <Link to={`/invoices/${inv.id}`} className="text-indigo-600 hover:underline font-medium">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-gray-700">
                          {inv.contact
                            ? `${inv.contact.firstName} ${inv.contact.lastName}`
                            : inv.family?.name ?? '—'}
                        </td>
                        <td className="px-6 py-3 font-medium">{formatCurrency(inv.amountDue)}</td>
                        <td className="px-6 py-3 text-red-600">{formatDate(inv.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">Invoice Summary</h2>
          </CardHeader>
          <CardBody>
            {invoiceStats.isLoading ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Draft', value: invoiceStats.data?.draft ?? 0, status: 'draft' },
                  { label: 'Paid', value: invoiceStats.data?.paid ?? 0, status: 'paid' },
                  { label: 'Overdue', value: invoiceStats.data?.overdue ?? 0, status: 'overdue' },
                  { label: 'Total', value: invoiceStats.data?.total ?? 0, status: '' },
                ].map(({ label, value, status }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {status && (
                        <Badge variant={STATUS_COLORS[status] as 'green' | 'red' | 'gray' | 'blue' || 'gray'}>
                          {label}
                        </Badge>
                      )}
                      {!status && <span className="text-sm font-medium text-gray-700">{label}</span>}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
