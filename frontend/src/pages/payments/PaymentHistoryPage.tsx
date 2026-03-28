import { Receipt } from 'lucide-react';
import { useMyPayments } from '../../hooks/useClient';

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  succeeded: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-500',
  pending: 'bg-yellow-100 text-yellow-700',
};

export function PaymentHistoryPage() {
  const { data, isLoading } = useMyPayments();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>

      {isLoading && <div className="text-sm text-gray-400">Loading...</div>}

      {!isLoading && !data?.payments.length && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Receipt className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No payment history yet.</p>
        </div>
      )}

      {!!data?.payments.length && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Method</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {payment.invoice?.invoiceNumber ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-gray-600 capitalize">
                    {payment.paymentMethodType.replace(/_/g, ' ')}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    ${Number(payment.amount).toFixed(2)} {payment.currency}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[payment.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
