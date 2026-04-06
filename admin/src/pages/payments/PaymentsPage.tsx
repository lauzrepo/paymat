import { useState } from 'react';
import { usePayments, usePaymentStats } from '../../hooks/usePayments';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/shared/StatCard';
import { formatCurrency, formatDate } from '../../lib/utils';
import { DollarSign, CheckCircle, Hash } from 'lucide-react';

const STATUS_VARIANT: Record<string, 'green' | 'red' | 'gray' | 'yellow'> = {
  succeeded: 'green', failed: 'red', refunded: 'yellow',
};

export function PaymentsPage() {
  const [status, setStatus] = useState('');
  const payments = usePayments({ status: status || undefined });
  const stats = usePaymentStats();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Payments</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Payments" value={stats.data?.total ?? '—'} icon={<Hash className="h-5 w-5" />} />
        <StatCard label="Successful" value={stats.data?.succeeded ?? '—'} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard label="Total Collected" value={formatCurrency(stats.data?.totalAmount ?? 0)} icon={<DollarSign className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="appearance-none bg-white text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <span className="text-sm text-gray-500 ml-auto">{payments.data?.total ?? 0} payments</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {payments.isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !payments.data?.items.length ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500">No payments found.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {payments.data.items.map((p) => (
                  <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.amount, p.currency)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.invoice?.invoiceNumber ?? '—'} · <span className="capitalize">{p.paymentMethodType}</span>
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[p.status] ?? 'gray'}>{p.status}</Badge>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Invoice</th>
                      <th className="px-6 py-3 text-left">Amount</th>
                      <th className="px-6 py-3 text-left">Method</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.data.items.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-700">{p.invoice?.invoiceNumber ?? '—'}</td>
                        <td className="px-6 py-3 font-medium">{formatCurrency(p.amount, p.currency)}</td>
                        <td className="px-6 py-3 text-gray-600 capitalize">{p.paymentMethodType}</td>
                        <td className="px-6 py-3">
                          <Badge variant={STATUS_VARIANT[p.status] ?? 'gray'}>{p.status}</Badge>
                        </td>
                        <td className="px-6 py-3 text-gray-500">{formatDate(p.createdAt)}</td>
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
