import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Play, CreditCard, CheckCircle, AlertTriangle, XCircle, Clock, FileText, TrendingUp, AlertCircle, Download, Mail, BarChart2, ExternalLink } from 'lucide-react';
import { apiClient } from '../../lib/axios';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/utils';

interface BillingInfo {
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface RunResult {
  invoicesCreated: number;
  autoCharged: number;
  errors: number;
  errorMessages: string[];
  activeEnrollments: number;
}

interface InvoiceStats {
  total: number;
  paid: number;
  overdue: number;
  draft: number;
  totalAmountDue: number;
  totalAmountPaid: number;
}

const STRIPE_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  active: {
    label: 'Active',
    color: 'text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-900/30 dark:border-green-800',
    icon: <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />,
    description: 'Your Paymat subscription is active.',
  },
  past_due: {
    label: 'Past Due',
    color: 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-900/30 dark:border-orange-800',
    icon: <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
    description: 'Your last payment failed. Update your payment method to avoid interruption.',
  },
  canceled: {
    label: 'Canceled',
    color: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800',
    icon: <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
    description: 'Your subscription has been canceled. Contact support to reactivate.',
  },
  trialing: {
    label: 'Trial',
    color: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-800',
    icon: <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
    description: 'You are on a free trial.',
  },
  inactive: {
    label: 'Not subscribed',
    color: 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-700/50 dark:border-gray-600',
    icon: <CreditCard className="h-4 w-4 text-gray-400 dark:text-gray-500" />,
    description: 'Contact your account manager to set up a subscription.',
  },
};

export function BillingPage() {
  const [searchParams] = useSearchParams();

  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');

  const success = searchParams.get('success') === 'true';
  const canceled = searchParams.get('canceled') === 'true';

  useEffect(() => {
    apiClient.get('/billing/status')
      .then((r) => setBilling(r.data.data.billing))
      .catch(() => {});

    apiClient.get('/invoices/stats')
      .then((r) => setStats(r.data.data.stats))
      .catch(() => {});
  }, []);

  const handleRunBilling = async () => {
    setRunning(true);
    setError('');
    setRunResult(null);
    try {
      const { data } = await apiClient.post('/billing/run');
      setRunResult(data.data);
      // Refresh stats after run
      apiClient.get('/invoices/stats').then((r) => setStats(r.data.data.stats)).catch(() => {});
    } catch {
      setError('Billing run failed. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data } = await apiClient.post('/billing/portal');
      window.location.href = data.data.url;
    } catch {
      setError('Failed to open billing portal. Please try again.');
      setPortalLoading(false);
    }
  };

  const stripeStatus = billing?.subscriptionStatus ?? 'inactive';
  const stripeConfig = STRIPE_STATUS[stripeStatus] ?? STRIPE_STATUS.inactive;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Billing</h1>

      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Subscription activated successfully. Welcome aboard!
        </div>
      )}
      {canceled && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-3 text-yellow-700 dark:text-yellow-300 text-sm">
          Checkout was canceled. Your subscription has not changed.
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* ── Invoice stats ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FileText className="h-5 w-5 text-indigo-500" />}
            label="Total invoices"
            value={String(stats.total)}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-green-500" />}
            label="Collected"
            value={formatCurrency(stats.totalAmountPaid)}
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-blue-500" />}
            label="Outstanding"
            value={formatCurrency(stats.totalAmountDue - stats.totalAmountPaid)}
          />
          <StatCard
            icon={<AlertCircle className="h-5 w-5 text-red-400" />}
            label="Overdue"
            value={String(stats.overdue)}
            valueClass={stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : undefined}
          />
        </div>
      )}

      {/* ── Billing run ── */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Billing run</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Generate invoices and auto-charge cards for all enrollments due today or earlier.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <Button onClick={handleRunBilling} loading={running} disabled={running}>
            <Play className="h-4 w-4 mr-2" />
            Run billing now
          </Button>

          {runResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <RunStat label="Invoices created" value={runResult.invoicesCreated} />
                <RunStat label="Auto-charged" value={runResult.autoCharged} />
                <RunStat label="Active enrollments" value={runResult.activeEnrollments} />
                <RunStat label="Errors" value={runResult.errors} valueClass={runResult.errors > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'} />
              </div>
              {runResult.errorMessages?.length > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 space-y-1">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide mb-1">Error details</p>
                  {runResult.errorMessages.map((msg, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400 font-mono">{msg}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Invoices are also automatically generated each day via a scheduled job.{' '}
            <Link to="/invoices" className="text-indigo-600 dark:text-indigo-400 hover:underline">View all invoices →</Link>
          </p>
        </CardBody>
      </Card>

      {/* ── Reports ── */}
      <ReportsCard />

      {/* ── Paymat subscription ── */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Paymat subscription</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${stripeConfig.color}`}>
            {stripeConfig.icon}
            <div>
              <p className="text-sm font-medium">{stripeConfig.label}</p>
              <p className="text-xs opacity-80 mt-0.5">{stripeConfig.description}</p>
            </div>
          </div>

          {billing?.stripeCustomerId && stripeStatus !== 'inactive' && (
            <Button variant="secondary" loading={portalLoading} onClick={handleManageBilling}>
              <CreditCard className="h-4 w-4 mr-2" />
              Manage subscription
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4 flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-lg font-semibold mt-0.5 ${valueClass ?? 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
      </div>
    </div>
  );
}

function RunStat({ label, value, valueClass }: { label: string; value: number; valueClass?: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${valueClass ?? 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
    </div>
  );
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function ReportsCard() {
  const now = new Date();
  const [mode, setMode] = useState<'monthly' | 'annual'>('monthly');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [preview, setPreview] = useState<{ totalCollected: number; totalInvoiced: number; outstanding: number; invoicesCreated: number; totalRefunded?: number; grossCollected?: number; netRevenue?: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [emailAddr, setEmailAddr] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  useEffect(() => {
    setPreview(null);
    setEmailSent(false);
    setEmailError('');
  }, [mode, year, month]);

  const loadPreview = async () => {
    setPreviewLoading(true);
    try {
      if (mode === 'monthly') {
        const { data } = await apiClient.get(`/billing/reports/monthly/${year}/${month}`);
        const s = data.data.statement.summary;
        setPreview({ totalCollected: s.totalCollected, totalInvoiced: s.totalInvoiced, outstanding: s.outstanding, invoicesCreated: s.invoicesCreated, totalRefunded: s.totalRefunded });
      } else {
        const { data } = await apiClient.get(`/billing/reports/annual/${year}`);
        const t = data.data.summary.totals;
        setPreview({ totalCollected: t.grossCollected, grossCollected: t.grossCollected, netRevenue: t.netRevenue, totalInvoiced: 0, outstanding: 0, invoicesCreated: 0, totalRefunded: t.refunded });
      }
    } catch { /* ignore */ }
    setPreviewLoading(false);
  };

  const handleConnectDashboard = async () => {
    setDashboardLoading(true);
    try {
      const { data } = await apiClient.post('/billing/connect-dashboard');
      window.location.href = data.data.url;
    } catch { /* ignore */ }
    setDashboardLoading(false);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = mode === 'monthly'
        ? `/billing/reports/monthly/${year}/${month}/download`
        : `/billing/reports/annual/${year}/download`;
      const { data, headers } = await apiClient.get(url, { responseType: 'blob' });
      const disposition = headers['content-disposition'] ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `report-${year}.csv`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch { /* ignore */ }
    setDownloading(false);
  };

  const handleEmail = async () => {
    if (!emailAddr) return;
    setEmailSending(true);
    setEmailError('');
    setEmailSent(false);
    try {
      const url = mode === 'monthly'
        ? `/billing/reports/monthly/${year}/${month}/email`
        : `/billing/reports/annual/${year}/email`;
      await apiClient.post(url, { email: emailAddr });
      setEmailSent(true);
    } catch {
      setEmailError('Failed to send email. Check the address and try again.');
    }
    setEmailSending(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-indigo-500" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Reports & Statements</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Download monthly statements or annual revenue summaries for tax and bookkeeping.</p>
      </CardHeader>
      <CardBody className="space-y-5">
        {/* Mode + period selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-sm">
            <button
              onClick={() => setMode('monthly')}
              className={`px-4 py-2 font-medium transition-colors ${mode === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setMode('annual')}
              className={`px-4 py-2 font-medium transition-colors ${mode === 'annual' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
            >
              Annual (1099)
            </button>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="appearance-none bg-white dark:bg-gray-700 dark:text-gray-100 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {mode === 'monthly' && (
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="appearance-none bg-white dark:bg-gray-700 dark:text-gray-100 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {MONTH_NAMES.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
            </select>
          )}
          <Button variant="secondary" size="sm" loading={previewLoading} onClick={loadPreview}>
            Preview
          </Button>
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {mode === 'monthly' ? (
              <>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Invoices created</p><p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{preview.invoicesCreated}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Total invoiced</p><p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(preview.totalInvoiced)}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Collected</p><p className="text-lg font-semibold text-green-600 dark:text-green-400 mt-0.5">{formatCurrency(preview.totalCollected)}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p><p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(preview.outstanding)}</p></div>
              </>
            ) : (
              <>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Gross collected</p><p className="text-lg font-semibold text-green-600 dark:text-green-400 mt-0.5">{formatCurrency(preview.grossCollected ?? 0)}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Total refunded</p><p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400 mt-0.5">{formatCurrency(preview.totalRefunded ?? 0)}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Net revenue</p><p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(preview.netRevenue ?? 0)}</p></div>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" loading={downloading} onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1.5" /> Download CSV
          </Button>
          <Button variant="secondary" size="sm" loading={dashboardLoading} onClick={handleConnectDashboard}>
            <ExternalLink className="h-4 w-4 mr-1.5" /> View 1099-K in Stripe
          </Button>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email statement</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailAddr}
              onChange={(e) => { setEmailAddr(e.target.value); setEmailSent(false); setEmailError(''); }}
              placeholder="admin@example.com"
              className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
            />
            <Button size="sm" loading={emailSending} onClick={handleEmail} disabled={!emailAddr}>
              <Mail className="h-4 w-4 mr-1.5" /> Send
            </Button>
          </div>
          {emailSent && <p className="text-xs text-green-600 dark:text-green-400">Statement sent to {emailAddr}</p>}
          {emailError && <p className="text-xs text-red-500 dark:text-red-400">{emailError}</p>}
          {mode === 'annual' && <p className="text-xs text-gray-400 dark:text-gray-500">Annual summary is for reference only — not an official IRS 1099 form.</p>}
        </div>
      </CardBody>
    </Card>
  );
}
