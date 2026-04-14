import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Play, CreditCard, CheckCircle, AlertTriangle, XCircle, Clock, FileText, TrendingUp, AlertCircle } from 'lucide-react';
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
