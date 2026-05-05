import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, DollarSign, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { useInvoices, useInvoiceStats, useCreateInvoice, useVoidInvoice } from '../../hooks/useInvoices';
import { useProcessPayment } from '../../hooks/usePayments';
import { useContacts } from '../../hooks/useContacts';
import { useEnrollments } from '../../hooks/useEnrollments';
import { useTenantBranding } from '../../hooks/useTenant';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/shared/StatCard';
import { BulkInvoicePDF } from '../../components/BulkInvoicePDF';
import { formatCurrency, formatDate } from '../../lib/utils';

const STATUS_VARIANT: Record<string, 'green' | 'red' | 'gray' | 'blue' | 'yellow'> = {
  paid: 'green', overdue: 'red', draft: 'gray', sent: 'blue', void: 'gray',
};

export function InvoicesPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [showForm, setShowForm] = useState(false);
  const [lineItems, setLineItems] = useState([{ enrollmentId: '', description: '', quantity: 1, unitPrice: '' }]);
  const [form, setForm] = useState({ contactId: '', dueDate: '', notes: '' });

  const [paymentModal, setPaymentModal] = useState<{ invoiceId: string; invoiceNumber: string; amountDue: number } | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', notes: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  const invoices = useInvoices({ status: status || undefined, contactId: searchParams.get('contactId') ?? undefined });
  const branding = useTenantBranding();
  const stats = useInvoiceStats();
  const contacts = useContacts();
  const enrollments = useEnrollments({ contactId: form.contactId || undefined, status: 'active' });
  const create = useCreateInvoice();
  const recordPayment = useProcessPayment();
  const voidInv = useVoidInvoice();

  const openPaymentModal = (inv: { id: string; invoiceNumber: string; amountDue: number }) => {
    setPaymentModal({ invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, amountDue: inv.amountDue });
    setPaymentForm({ amount: String(inv.amountDue), method: 'cash', notes: '' });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;
    await recordPayment.mutateAsync({
      invoiceId: paymentModal.invoiceId,
      amount: parseFloat(paymentForm.amount),
      paymentMethodType: paymentForm.method,
      notes: paymentForm.notes || undefined,
    });
    setPaymentModal(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      contactId: form.contactId || undefined,
      dueDate: form.dueDate,
      notes: form.notes || undefined,
      lineItems: lineItems.map((li) => ({
        enrollmentId: li.enrollmentId && li.enrollmentId !== '__custom__' ? li.enrollmentId : undefined,
        description: li.description,
        quantity: li.quantity,
        unitPrice: parseFloat(li.unitPrice),
      })),
    });
    setShowForm(false);
    setForm({ contactId: '', dueDate: '', notes: '' });
    setLineItems([{ enrollmentId: '', description: '', quantity: 1, unitPrice: '' }]);
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const allIds = invoices.data?.items.map((i) => i.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(allIds));

  const handleBulkDownload = async () => {
    const selected = (invoices.data?.items ?? []).filter((inv) => selectedIds.has(inv.id));
    if (!selected.length) return;
    setDownloading(true);
    try {
      const orgName = branding.data?.name ?? 'Organization';
      const blob = await pdf(<BulkInvoicePDF invoices={selected} orgName={orgName} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selected.length === 1 ? `${selected[0].invoiceNumber}.pdf` : `invoices-${selected.length}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const selectCls = 'appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const inputCls = 'appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invoices</h1>
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
          <CardHeader><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New Invoice</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bill to</label>
                  <select
                    value={form.contactId}
                    onChange={(e) => {
                      setForm({ ...form, contactId: e.target.value });
                      setLineItems([{ enrollmentId: '', description: '', quantity: 1, unitPrice: '' }]);
                    }}
                    className={selectCls}
                  >
                    <option value="">Select contact…</option>
                    {contacts.data?.items.map((c) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    required
                    className={selectCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional"
                    className={selectCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Line items</label>
                <div className="space-y-2">
                  {lineItems.map((li, i) => {
                    const isCustom = li.enrollmentId === '__custom__';
                    return (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6">
                          <select
                            value={li.enrollmentId}
                            required
                            onChange={(e) => {
                              const c = [...lineItems];
                              const val = e.target.value;
                              c[i].enrollmentId = val;
                              if (val === '__custom__') {
                                c[i].description = '';
                                c[i].unitPrice = '';
                              } else if (val) {
                                const enr = enrollments.data?.items.find((en) => en.id === val);
                                c[i].description = enr?.program?.name ?? '';
                                c[i].unitPrice = String(enr?.program?.price ?? '');
                              }
                              setLineItems(c);
                            }}
                            className={selectCls}
                          >
                            <option value="">Select enrollment…</option>
                            {enrollments.data?.items.map((en) => (
                              <option key={en.id} value={en.id}>{en.program?.name ?? en.id}</option>
                            ))}
                            <option value="__custom__">Custom item…</option>
                          </select>
                        </div>
                        <div className="col-span-5 grid grid-cols-5 gap-2">
                          {isCustom ? (
                            <>
                              <div className="col-span-3">
                                <input type="text" placeholder="Description" value={li.description} required
                                  onChange={(e) => { const c = [...lineItems]; c[i].description = e.target.value; setLineItems(c); }}
                                  className={inputCls}
                                />
                              </div>
                              <div className="col-span-1">
                                <input type="number" placeholder="Qty" min="1" value={li.quantity}
                                  onChange={(e) => { const c = [...lineItems]; c[i].quantity = parseInt(e.target.value); setLineItems(c); }}
                                  className={inputCls}
                                />
                              </div>
                              <div className="col-span-1">
                                <input type="number" placeholder="Price" step="0.01" min="0" value={li.unitPrice} required
                                  onChange={(e) => { const c = [...lineItems]; c[i].unitPrice = e.target.value; setLineItems(c); }}
                                  className={inputCls}
                                />
                              </div>
                            </>
                          ) : (
                            <div className="col-span-5 flex items-center gap-2">
                              <span className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1">{li.description || '—'}</span>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {li.unitPrice ? formatCurrency(parseFloat(li.unitPrice)) : '—'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="col-span-1 flex justify-center">
                          {lineItems.length > 1 && (
                            <button type="button" onClick={() => setLineItems(lineItems.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-600 font-bold text-lg leading-none">×</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button type="button"
                  onClick={() => setLineItems([...lineItems, { enrollmentId: '', description: '', quantity: 1, unitPrice: '' }])}
                  className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">+ Add line item</button>
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
          <div className="flex flex-wrap items-center gap-3">
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="void">Void</option>
            </select>
            {selectedIds.size > 0 ? (
              <div className="hidden md:flex items-center gap-3 ml-auto">
                <span className="text-sm text-gray-600 dark:text-gray-400">{selectedIds.size} selected</span>
                <Button size="sm" onClick={handleBulkDownload} loading={downloading}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Download PDFs
                </Button>
                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  Clear
                </button>
              </div>
            ) : null}
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto md:ml-0">{invoices.data?.total ?? 0} invoices</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {invoices.isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !invoices.data?.items.length ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No invoices found.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                  <button onClick={toggleSelectAll} className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                  {selectedIds.size > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{selectedIds.size} selected</span>
                  )}
                </div>
                {invoices.data.items.map((inv) => (
                  <div key={inv.id} className={`px-4 py-3 space-y-2 ${selectedIds.has(inv.id) ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(inv.id)}
                          onChange={() => toggleSelect(inv.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                        />
                        <Link to={`/invoices/${inv.id}`} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                          {inv.invoiceNumber}
                        </Link>
                      </div>
                      <Badge variant={STATUS_VARIANT[inv.status] ?? 'gray'}>{inv.status}</Badge>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      <p>{inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName}` : inv.family?.name ?? '—'}</p>
                      <p>{formatCurrency(inv.amountDue)} · Due {formatDate(inv.dueDate)}</p>
                    </div>
                    {inv.status !== 'paid' && inv.status !== 'void' && (
                      <div className="flex gap-2 pt-1">
                        <Button variant="ghost" size="sm" onClick={() => openPaymentModal(inv)}>Record payment</Button>
                        <Button variant="ghost" size="sm" onClick={() => voidInv.mutate(inv.id)}>Void</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
                    <tr>
                      <th className="pl-4 pr-2 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left">Invoice</th>
                      <th className="px-4 py-3 text-left">Billed to</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Due</th>
                      <th className="px-4 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {invoices.data.items.map((inv) => (
                      <tr key={inv.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${selectedIds.has(inv.id) ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
                        <td className="pl-4 pr-2 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(inv.id)}
                            onChange={() => toggleSelect(inv.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <Link to={`/invoices/${inv.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{inv.invoiceNumber}</Link>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName}` : inv.family?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-medium dark:text-gray-100">{formatCurrency(inv.amountDue)}</td>
                        <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[inv.status] ?? 'gray'}>{inv.status}</Badge></td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(inv.dueDate)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {inv.status !== 'paid' && inv.status !== 'void' && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => openPaymentModal(inv)}>Record payment</Button>
                                <Button variant="ghost" size="sm" onClick={() => voidInv.mutate(inv.id)}>Void</Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardBody>
      </Card>
      {paymentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Record Payment — {paymentModal.invoiceNumber}</h2>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount ($)</label>
                <input
                  type="number" step="0.01" min="0.01" required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Invoice total: ${paymentModal.amountDue}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="card">Card (manual)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="e.g. Check #1042"
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={() => setPaymentModal(null)}>Cancel</Button>
                <Button type="submit" loading={recordPayment.isPending}>Record payment</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile sticky bottom bar — shown only when items are selected */}
      {selectedIds.size > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{selectedIds.size} selected</span>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              Clear
            </button>
          </div>
          <Button onClick={handleBulkDownload} loading={downloading}>
            <Download className="h-4 w-4 mr-1.5" /> Download PDFs
          </Button>
        </div>
      )}
    </div>
  );
}
