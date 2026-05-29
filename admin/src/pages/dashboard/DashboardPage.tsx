import { useState, KeyboardEvent } from 'react';
import { Users, DollarSign, AlertCircle, TrendingUp, Bot, Send } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useInvoiceStats } from '../../hooks/useInvoices';
import { usePaymentStats } from '../../hooks/usePayments';
import { useContacts } from '../../hooks/useContacts';
import { useInvoices } from '../../hooks/useInvoices';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useMate } from '../../context/MateContext';

const STATUS_COLORS: Record<string, string> = {
  paid: 'green',
  overdue: 'red',
  draft: 'gray',
  sent: 'blue',
  void: 'gray',
};

const MATE_CHIPS = [
  'Overdue invoices',
  'Revenue this month',
  'Recent payments',
  'Run billing',
];

function MateWidget() {
  const { submitMessage, loading } = useMate();
  const navigate = useNavigate();
  const [input, setInput] = useState('');

  async function handleSubmit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');
    await submitMessage(trimmed);
    navigate('/assistant');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit(input);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Ask Mate</h2>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus-within:border-indigo-400 transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your data…"
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => handleSubmit(input)}
            disabled={!input.trim() || loading}
            className="h-7 w-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {MATE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSubmit(chip)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export function DashboardPage() {
  const invoiceStats = useInvoiceStats();
  const paymentStats = usePaymentStats();
  const contacts = useContacts({ status: 'active' });
  const overdueInvoices = useInvoices({ status: 'overdue' });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Members" value={contacts.data?.total ?? '—'} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Revenue This Month" value={formatCurrency(paymentStats.data?.totalAmount ?? 0)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Overdue Invoices" value={invoiceStats.data?.overdue ?? '—'} icon={<AlertCircle className="h-5 w-5" />} />
        <StatCard label="Total Collected" value={formatCurrency(invoiceStats.data?.totalAmountPaid ?? 0)} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <MateWidget />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Overdue Invoices</h2>
              <Link to="/invoices?status=overdue" className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">View all</Link>
            </CardHeader>
            <CardBody className="p-0">
              {overdueInvoices.isLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : !overdueInvoices.data?.items.length ? (
                <p className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No overdue invoices.</p>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                    {overdueInvoices.data.items.map((inv) => (
                      <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <Link to={`/invoices/${inv.id}`} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            {inv.invoiceNumber}
                          </Link>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName}` : inv.family?.name ?? '—'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(inv.amountDue)}</p>
                          <p className="text-xs text-red-600">{formatDate(inv.dueDate)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
                        <tr>
                          <th className="px-6 py-3 text-left">Invoice</th>
                          <th className="px-6 py-3 text-left">Billed to</th>
                          <th className="px-6 py-3 text-left">Amount</th>
                          <th className="px-6 py-3 text-left">Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {overdueInvoices.data.items.map((inv) => (
                          <tr key={inv.id}>
                            <td className="px-6 py-3">
                              <Link to={`/invoices/${inv.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">{inv.invoiceNumber}</Link>
                            </td>
                            <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                              {inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName}` : inv.family?.name ?? '—'}
                            </td>
                            <td className="px-6 py-3 font-medium dark:text-gray-100">{formatCurrency(inv.amountDue)}</td>
                            <td className="px-6 py-3 text-red-600 dark:text-red-400">{formatDate(inv.dueDate)}</td>
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

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Invoice Summary</h2>
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
                        <Badge variant={STATUS_COLORS[status] as 'green' | 'red' | 'gray' | 'blue' || 'gray'}>{label}</Badge>
                      )}
                      {!status && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</span>
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
