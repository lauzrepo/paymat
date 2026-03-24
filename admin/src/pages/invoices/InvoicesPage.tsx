import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, DollarSign, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useInvoices, useInvoiceStats, useCreateInvoice, useMarkInvoicePaid, useVoidInvoice } from '../../hooks/useInvoices';
import { useContacts } from '../../hooks/useContacts';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/shared/StatCard';
import { formatCurrency, formatDate } from '../../lib/utils';

const STATUS_VARIANT: Record<string, 'green' | 'red' | 'gray' | 'blue' | 'yellow'> = {
  paid: 'green', overdue: 'red', draft: 'gray', sent: 'blue', void: 'gray',
};

export function InvoicesPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [showForm, setShowForm] = useState(false);
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unitPrice: '' }]);
  const [form, setForm] = useState({ contactId: '', dueDate: '', notes: '' });

  const invoices = useInvoices({ status: status || undefined, contactId: searchParams.get('contactId') ?? undefined });
  const stats = useInvoiceStats();
  const contacts = useContacts();
  const create = useCreateInvoice();
  const markPaid = useMarkInvoicePaid();
  const voidInv = useVoidInvoice();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      contactId: form.contactId || undefined,
      dueDate: form.dueDate,
      notes: form.notes || undefined,
      lineItems: lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: parseFloat(li.unitPrice),
      })),
    });
    setShowForm(false);
    setForm({ contactId: '', dueDate: '', notes: '' });
    setLineItems([{ description: '', quantity: 1, unitPrice: '' }]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create Invoice
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.data?.total ?? '—'} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Paid" value={stats.data?.paid ?? '—'} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard label="Overdue" value={stats.data?.overdue ?? '—'} icon={<AlertCircle className="h-5 w-5" />} />
        <StatCard
          label="Outstanding"
          value={formatCurrency((stats.data?.totalAmountDue ?? 0) - (stats.data?.totalAmountPaid ?? 0))}
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      {showForm && (
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-gray-900">New Invoice</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bill to</label>
                  <select
                    value={form.contactId}
                    onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                    className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select contact…</option>
                    {contacts.data?.items.map((c) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    required
                    className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional"
                    className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Line items</label>
                <div className="space-y-2">
                  {lineItems.map((li, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2">
                      <div className="col-span-6">
                        <input type="text" placeholder="Description" value={li.description} required
                          onChange={(e) => { const c = [...lineItems]; c[i].description = e.target.value; setLineItems(c); }}
                          className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <input type="number" placeholder="Qty" min="1" value={li.quantity}
                          onChange={(e) => { const c = [...lineItems]; c[i].quantity = parseInt(e.target.value); setLineItems(c); }}
                          className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="col-span-3">
                        <input type="number" placeholder="Unit price" step="0.01" min="0" value={li.unitPrice} required
                          onChange={(e) => { const c = [...lineItems]; c[i].unitPrice = e.target.value; setLineItems(c); }}
                          className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="col-span-1 flex items-center">
                        {lineItems.length > 1 && (
                          <button type="button" onClick={() => setLineItems(lineItems.filter((_, j) => j !== i))}
                            className="text-red-400 hover:text-red-600 font-bold text-lg leading-none">×</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: '' }])}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-500">+ Add line item</button>
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={create.isPending}>Create Invoice</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="appearance-none bg-white text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="void">Void</option>
            </select>
            <span className="text-sm text-gray-500 ml-auto">{invoices.data?.total ?? 0} invoices</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {invoices.isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !invoices.data?.items.length ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500">No invoices found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Invoice</th>
                  <th className="px-6 py-3 text-left">Billed to</th>
                  <th className="px-6 py-3 text-left">Amount</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Due</th>
                  <th className="px-6 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.data.items.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">
                      <Link to={`/invoices/${inv.id}`} className="text-indigo-600 hover:underline">{inv.invoiceNumber}</Link>
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName}` : inv.family?.name ?? '—'}
                    </td>
                    <td className="px-6 py-3 font-medium">{formatCurrency(inv.amountDue)}</td>
                    <td className="px-6 py-3"><Badge variant={STATUS_VARIANT[inv.status] ?? 'gray'}>{inv.status}</Badge></td>
                    <td className="px-6 py-3 text-gray-500">{formatDate(inv.dueDate)}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-1">
                        {inv.status !== 'paid' && inv.status !== 'void' && (
                          <>
                            <Button variant="ghost" size="sm" loading={markPaid.isPending} onClick={() => markPaid.mutate(inv.id)}>Mark paid</Button>
                            <Button variant="ghost" size="sm" onClick={() => voidInv.mutate(inv.id)}>Void</Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
