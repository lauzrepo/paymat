import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { apiClient } from '../../lib/axios';

interface BillingInfo {
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  active: {
    label: 'Active',
    color: 'text-green-700 bg-green-50 border-green-200',
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    description: 'Your subscription is active. All features are available.',
  },
  past_due: {
    label: 'Past Due',
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
    description: 'Your last payment failed. Please update your payment method to avoid service interruption.',
  },
  canceled: {
    label: 'Canceled',
    color: 'text-red-700 bg-red-50 border-red-200',
    icon: <XCircle className="h-5 w-5 text-red-600" />,
    description: 'Your subscription has been canceled. Contact support to reactivate.',
  },
  trialing: {
    label: 'Trial',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    icon: <Clock className="h-5 w-5 text-blue-600" />,
    description: 'You are currently on a free trial.',
  },
  inactive: {
    label: 'Not subscribed',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    icon: <CreditCard className="h-5 w-5 text-gray-400" />,
    description: 'You do not have an active subscription. Contact your account manager to get started.',
  },
};

export function BillingPage() {
  const [searchParams] = useSearchParams();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');

  const success = searchParams.get('success') === 'true';
  const canceled = searchParams.get('canceled') === 'true';

  useEffect(() => {
    apiClient.get('/billing/status')
      .then((r) => setBilling(r.data.data.billing))
      .catch(() => setError('Failed to load billing info.'))
      .finally(() => setLoading(false));
  }, []);

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

  const status = billing?.subscriptionStatus ?? 'inactive';
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Subscription activated successfully. Welcome aboard!
        </div>
      )}

      {canceled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-yellow-700 text-sm">
          Checkout was canceled. Your subscription has not changed.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className={`rounded-xl border p-5 flex items-start gap-4 ${statusConfig.color}`}>
        <div className="flex-shrink-0 mt-0.5">{statusConfig.icon}</div>
        <div>
          <p className="font-semibold text-sm">{statusConfig.label}</p>
          <p className="text-sm mt-0.5 opacity-80">{statusConfig.description}</p>
        </div>
      </div>

      {!loading && billing?.stripeCustomerId && status !== 'inactive' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Manage subscription</h2>
          <p className="text-sm text-gray-500 mb-4">
            Update your payment method, download invoices, or cancel your plan.
          </p>
          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            <CreditCard className="h-4 w-4" />
            {portalLoading ? 'Opening...' : 'Manage Billing'}
          </button>
        </div>
      )}
    </div>
  );
}
