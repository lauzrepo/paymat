import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useInvoice, useVoidInvoice } from '../../hooks/useInvoices';
import { usePayments, useProcessPayment, useRefundPayment } from '../../hooks/usePayments';
import { queryClient } from '../../lib/queryClient';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatCurrency, formatDate } from '../../lib/utils';

const STATUS_VARIANT: Record<string, 'green' | 'red' | 'gray' | 'blue' | 'yellow'> = {
  paid: 'green', overdue: 'red', draft: 'gray', sent: 'blue', void: 'gray',
};

const PAYMENT_VARIANT: Record<string, 'green' | 'red' | 'gray' | 'blue' | 'yellow'> = {
  succeeded: 'green', failed: 'red', refunded: 'gray', pending: 'yellow',
};

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isLoading } = useInvoice(id!);
  const payments = usePayments({ invoiceId: id });
  const voidInv = useVoidInvoice();
  const processPayment = useProcessPayment();
  const refund = useRefundPayment();

  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', notes: '' });
  const [refundModal, setRefundModal] = useState<{ id: string; amount: number } | null>(null);
  const [refundAmount, setRefundAmount] = useState('');

  const openPayForm = () => {
    setPayForm({ amount: String(invoice?.amountDue ?? ''), method: 'cash', notes: '' });
    setShowPayForm(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    await processPayment.mutateAsync({
      invoiceId: id!,
      amount: parseFloat(payForm.amount),
      paymentMethodType: payForm.method,
      notes: payForm.notes || undefined,
    });
    queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    setShowPayForm(false);
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModal) return;
    await refund.mutateAsync({ id: refundModal.id, amount: parseFloat(refundAmount) || undefined });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    setRefundModal(null);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!invoice) return <p className="text-center py-20 text-gray-500">Invoice not found.</p>;

  const billTo = invoice.contact
    ? { label: `${invoice.contact.firstName} ${invoice.contact.lastName}`, href: `/contacts/${invoice.contact.id}` }
    : invoice.family
    ? { label: invoice.family.name, href: `/families/${invoice.family.id}` }
    : null;

  const balance = invoice.amountDue - invoice.amountPaid;
  const canAct = invoice.status !== 'paid' && invoice.status !== 'void';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/invoices" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
        <Badge variant={STATUS_VARIANT[invoice.status] ?? 'gray'}>{invoice.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader><h2 className="text-base font-semibold text-gray-900">Details</h2></CardHeader>
            <CardBody className="space-y-3 text-sm">
              <Row label="Bill to">
                {billTo ? (
                  <Link to={billTo.href} className="text-indigo-600 hover:underline font-medium">{billTo.label}</Link>
                ) : (
                  <span className="text-gray-900 font-medium">—</span>
                )}
              </Row>
              <Row label="Amount due" value={formatCurrency(invoice.amountDue)} />
              <Row label="Amount paid" value={formatCurrency(invoice.amountPaid)} />
              <Row label="Balance" value={formatCurrency(balance)} />
              <Row label="Due date" value={formatDate(invoice.dueDate)} />
              {invoice.paidAt && <Row label="Paid on" value={formatDate(invoice.paidAt)} />}
              {invoice.notes && <Row label="Notes" value={invoice.notes} />}
              <Row label="Created" value={formatDate(invoice.createdAt)} />
            </CardBody>
          </Card>

          {canAct && (
            <div className="flex flex-col gap-2">
              <Button variant="secondary" size="sm" onClick={openPayForm}>
                Record payment
              </Button>
              <Button
                variant="ghost"
                size="sm"
                loading={voidInv.isPending}
                onClick={() => {
                  if (window.confirm('Void this invoice? This cannot be undone.')) {
                    voidInv.mutate(invoice.id);
                  }
                }}
                className="text-red-500 hover:text-red-700"
              >
                Void invoice
              </Button>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><h2 className="text-base font-semibold text-gray-900">Line Items</h2></CardHeader>
            <CardBody className="p-0">
              {!invoice.lineItems?.length ? (
                <p className="px-6 py-6 text-sm text-gray-500">No line items.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Description</th>
                      <th className="px-6 py-3 text-right">Qty</th>
                      <th className="px-6 py-3 text-right">Unit price</th>
                      <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoice.lineItems.map((li) => (
                      <tr key={li.id}>
                        <td className="px-6 py-3">{li.description}</td>
                        <td className="px-6 py-3 text-right text-gray-500">{li.quantity}</td>
                        <td className="px-6 py-3 text-right text-gray-500">{formatCurrency(li.unitPrice)}</td>
                        <td className="px-6 py-3 text-right font-medium">{formatCurrency(li.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={3} className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Total</td>
                      <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">{formatCurrency(invoice.amountDue)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="text-base font-semibold text-gray-900">Payments</h2></CardHeader>
            <CardBody className="p-0">
              {payments.isLoading ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : !payments.data?.items.length ? (
                <p className="px-6 py-6 text-sm text-gray-500">No payments recorded.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Method</th>
                      <th className="px-6 py-3 text-left">Amount</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.data.items.map((p) => (
                      <tr key={p.id}>
                        <td className="px-6 py-3 text-gray-500">{formatDate(p.createdAt)}</td>
                        <td className="px-6 py-3 text-gray-700 capitalize">{p.paymentMethodType?.replace('_', ' ') ?? '—'}</td>
                        <td className="px-6 py-3 font-medium">{formatCurrency(p.amount)}</td>
                        <td className="px-6 py-3">
                          <Badge variant={PAYMENT_VARIANT[p.status] ?? 'gray'}>{p.status}</Badge>
                        </td>
                        <td className="px-6 py-3">
                          {p.status === 'succeeded' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setRefundModal({ id: p.id, amount: p.amount }); setRefundAmount(String(p.amount)); }}
                            >
                              Refund
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {showPayForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Record Payment</h2>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input
                  type="number" step="0.01" min="0.01" required
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">Balance: {formatCurrency(balance)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
                <select
                  value={payForm.method}
                  onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                  className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="card">Card (manual)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="e.g. Check #1042"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowPayForm(false)}>Cancel</Button>
                <Button type="submit" loading={processPayment.isPending}>Record payment</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {refundModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Refund Payment</h2>
            <form onSubmit={handleRefund} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refund amount ($)</label>
                <input
                  type="number" step="0.01" min="0.01" max={refundModal.amount} required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">Max: {formatCurrency(refundModal.amount)}</p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={() => setRefundModal(null)}>Cancel</Button>
                <Button type="submit" variant="danger" loading={refund.isPending}>Refund</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-gray-500">{label}</span>
      {children ?? <span className="text-gray-900 font-medium text-right max-w-xs truncate">{value}</span>}
    </div>
  );
}
