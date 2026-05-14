import { useState } from 'react';
import { CreditCard, CheckCircle, Trash2, RefreshCw } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAutopayStatus, useSetupAutopay, useSaveAutopay, useRemoveAutopay } from '../../hooks/useClient';
import type { AutopaySetupData } from '../../api/client';

function cardBrandLabel(brand: string | null): string {
  if (!brand) return 'Card';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

// ── Setup form (rendered inside <Elements>) ───────────────────────────────────

function SetupForm({
  setupIntentId,
  onSuccess,
  onError,
}: {
  setupIntentId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const saveAutopay = useSaveAutopay();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message ?? 'Could not save card. Please try again.');
      setSubmitting(false);
      return;
    }

    try {
      await saveAutopay.mutateAsync(setupIntentId);
      onSuccess();
    } catch {
      onError('Card was saved with Stripe but we could not confirm it. Please refresh the page.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={submitting || !stripe}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
      >
        <CreditCard className="h-4 w-4" />
        {submitting ? 'Saving...' : 'Save card'}
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AutopayPage() {
  const { data: status, isLoading } = useAutopayStatus();
  const setupAutopay = useSetupAutopay();
  const removeAutopay = useRemoveAutopay();

  const [setupData, setSetupData] = useState<AutopaySetupData | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [uiState, setUiState] = useState<'idle' | 'loading' | 'form' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [removing, setRemoving] = useState(false);

  const openSetupForm = async () => {
    setUiState('loading');
    setMessage('');
    try {
      const data = await setupAutopay.mutateAsync();
      setSetupData(data);
      setStripePromise(loadStripe(data.publishableKey, { stripeAccount: data.connectAccountId }));
      setUiState('form');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(msg ?? 'Could not initialize card setup. Please try again.');
      setUiState('error');
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove your saved card? Automatic billing will stop working.')) return;
    setRemoving(true);
    try {
      await removeAutopay.mutateAsync();
    } finally {
      setRemoving(false);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-400 dark:text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Autopay</h1>

      {/* Current status card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Payment Method</h2>
        </div>

        <div className="px-5 py-4">
          {status?.enabled ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {cardBrandLabel(status.brand)} ending in {status.last4}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Your invoices will be charged automatically when due.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {removing ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No card on file. Add one below to enable automatic billing.
            </p>
          )}
        </div>
      </div>

      {/* Add / update card section */}
      {uiState === 'success' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-5">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Card saved successfully. Autopay is now enabled.</span>
          </div>
        </div>
      ) : uiState === 'form' && setupData && stripePromise ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {status?.enabled ? 'Update Card' : 'Add Card'}
            </h2>
          </div>
          <div className="px-5 py-4">
            {message && <p className="text-red-600 dark:text-red-400 text-sm mb-3">{message}</p>}
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: setupData.clientSecret, appearance: { theme: 'stripe' } }}
            >
              <SetupForm
                setupIntentId={setupData.clientSecret.split('_secret_')[0]}
                onSuccess={() => {
                  setUiState('success');
                  setSetupData(null);
                  setStripePromise(null);
                }}
                onError={(msg) => setMessage(msg)}
              />
            </Elements>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-5">
          {uiState === 'error' && message && (
            <p className="text-red-600 dark:text-red-400 text-sm mb-3">{message}</p>
          )}
          <button
            onClick={openSetupForm}
            disabled={uiState === 'loading'}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {uiState === 'loading' ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Loading...</>
            ) : (
              <><CreditCard className="h-4 w-4" />{status?.enabled ? 'Update card' : 'Add card'}</>
            )}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Your card is stored securely with Stripe. We never store full card numbers.
      </p>
    </div>
  );
}
