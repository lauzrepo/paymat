import { useState } from 'react';
import { CreditCard, ShieldCheck, X } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAutopayStatus, useInitializeAutopay, useConfirmAutopay, useRemoveAutopay } from '../hooks/useClient';
import type { AutopayInitData } from '../api/client';

// ── SetupForm (rendered inside <Elements>) ────────────────────────────────────

function SetupForm({
  userEmail,
  onSuccess,
  onError,
}: {
  userEmail?: string | null;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const confirmAutopay = useConfirmAutopay();
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !consented) return;
    setSubmitting(true);

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message ?? 'Could not save card. Please try again.');
      setSubmitting(false);
      return;
    }

    if (!setupIntent) {
      onError('Card setup incomplete. Please try again.');
      setSubmitting(false);
      return;
    }

    try {
      await confirmAutopay.mutateAsync(setupIntent.id);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      onError(msg ?? 'Card saved but we could not confirm it. Please refresh.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
        />
        <span className="text-xs text-gray-600 dark:text-gray-400">
          I authorize automatic charges on each billing date. A receipt will be sent to{' '}
          {userEmail ? <span className="font-medium">{userEmail}</span> : 'your email'} after every charge.
        </span>
      </label>
      <button
        type="submit"
        disabled={submitting || !stripe || !consented}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
      >
        <ShieldCheck className="h-4 w-4" />
        {submitting ? 'Saving...' : 'Save card & enable auto-pay'}
      </button>
    </form>
  );
}

// ── AutoPaySection ────────────────────────────────────────────────────────────

export function AutoPaySection({ userEmail }: { userEmail?: string | null }) {
  const { data: autopay, isLoading } = useAutopayStatus();
  const initAutopay = useInitializeAutopay();
  const removeAutopay = useRemoveAutopay();

  const [initData, setInitData] = useState<AutopayInitData | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'form' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const openSetupForm = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const data = await initAutopay.mutateAsync();
      setInitData(data);
      setStripePromise(loadStripe(data.publishableKey, { stripeAccount: data.connectAccountId }));
      setStatus('form');
    } catch {
      setStatus('error');
      setErrorMsg('Could not initialize auto-pay setup. Please try again.');
    }
  };

  const handleRemove = async () => {
    try {
      await removeAutopay.mutateAsync();
    } catch {
      // cache is invalidated regardless, so the UI reflects removal
    }
  };

  if (isLoading) return null;

  const card = autopay?.card;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-indigo-600" />
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Auto-Pay</h2>
      </div>

      <div className="px-5 py-4 space-y-4">
        {card ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} ending in {card.last4}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Expires {String(card.expMonth).padStart(2, '0')}/{card.expYear}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Auto-pay enabled</p>
            </div>
            <button
              onClick={handleRemove}
              disabled={removeAutopay.isPending}
              className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        ) : status === 'success' ? (
          <p className="text-sm text-green-600 dark:text-green-400">Auto-pay enabled successfully.</p>
        ) : status === 'form' && initData && stripePromise ? (
          <>
            {errorMsg && <p className="text-red-600 dark:text-red-400 text-sm">{errorMsg}</p>}
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: initData.clientSecret, appearance: { theme: 'stripe' } }}
            >
              <SetupForm
                userEmail={userEmail}
                onSuccess={() => setStatus('success')}
                onError={(msg) => setErrorMsg(msg)}
              />
            </Elements>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Save a card to be charged automatically on each billing date. You'll receive a receipt to your email after every charge.
            </p>
            {errorMsg && <p className="text-red-600 dark:text-red-400 text-sm">{errorMsg}</p>}
            <button
              onClick={openSetupForm}
              disabled={status === 'loading'}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" />
              {status === 'loading' ? 'Setting up...' : 'Enable auto-pay'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
