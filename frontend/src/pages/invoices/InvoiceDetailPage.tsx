import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ChevronLeft, CreditCard, CheckCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useMyInvoice, useInitializeInvoicePayment } from '../../hooks/useClient';
import { useQueryClient } from '@tanstack/react-query';
import type { PaymentInitData } from '../../api/client';
import { confirmInvoicePayment } from '../../api/client';
import { useOrgSlug } from '../../context/OrgSlugContext';

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-400',
};

// ── Stripe payment form (rendered inside <Elements>) ──────────────────────────

function PaymentForm({
  invoiceId,
  paymentIntentId,
  onSuccess,
  onError,
}: {
  invoiceId: string;
  paymentIntentId: string;
  onSuccess: (confirmedInvoice: import('../../api/client').Invoice) => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (error) {
      onError(error.message ?? 'Payment failed. Please try again.');
      setSubmitting(false);
      return;
    }
    // Sync payment status to our DB immediately (don't wait for webhook)
    let confirmedInvoice: import('../../api/client').Invoice;
    try {
      confirmedInvoice = await confirmInvoicePayment(invoiceId, paymentIntentId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      onError(msg ?? 'Payment was charged but we could not confirm it. Please refresh the page.');
      setSubmitting(false);
      return;
    }
    onSuccess(confirmedInvoice);
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
        {submitting ? 'Processing...' : 'Pay now'}
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orgSlug = useOrgSlug();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { data: invoice, isLoading } = useMyInvoice(id!);
  const initPayment = useInitializeInvoicePayment();

  const [payInit, setPayInit] = useState<PaymentInitData | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [payStatus, setPayStatus] = useState<'idle' | 'loading' | 'form' | 'success' | 'error'>('idle');
  const [payMessage, setPayMessage] = useState('');

  const outstanding = invoice ? Number(invoice.amountDue) - Number(invoice.amountPaid) : 0;
  const canPay = invoice ? ['draft', 'sent', 'overdue'].includes(invoice.status) && outstanding > 0 : false;

  // Handle Stripe redirect return (payment confirmed via redirect)
  useEffect(() => {
    const paymentIntentParam = searchParams.get('payment_intent');
    const status = searchParams.get('redirect_status');
    if (paymentIntentParam && status === 'succeeded' && id) {
      confirmInvoicePayment(id, paymentIntentParam)
        .then((confirmedInvoice) => {
          qc.setQueryData(['client', 'invoices', id], confirmedInvoice);
          setPayStatus('success');
          setPayMessage('Payment successful! Thank you.');
        })
        .catch(() => {
          qc.invalidateQueries({ queryKey: ['client', 'invoices', id] });
          setPayStatus('success');
          setPayMessage('Payment successful! Thank you.');
        });
    }
  }, [searchParams, id, qc]);

  const openPaymentForm = async () => {
    if (!id) return;
    setPayStatus('loading');
    setPayMessage('');
    try {
      const data = await initPayment.mutateAsync(id);
      setPayInit(data);
      const stripe = loadStripe(data.publishableKey, { stripeAccount: data.connectAccountId });
      setStripePromise(stripe);
      setPayStatus('form');
    } catch {
      setPayStatus('error');
      setPayMessage('Could not open payment form. Please try again.');
    }
  };

  if (isLoading) return <div className="text-sm text-gray-400">Loading...</div>;
  if (!invoice) return <div className="text-sm text-red-500">Invoice not found.</div>;

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-2">
        <Link to={`/${orgSlug}/invoices`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{invoice.invoiceNumber}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Due {new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[invoice.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </span>
        </div>

        <div className="px-5 py-4 space-y-2">
          {invoice.lineItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">{item.description}</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">${Number(item.total).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between text-sm font-semibold dark:text-gray-100">
          <span>Total</span>
          <span>${Number(invoice.amountDue).toFixed(2)} {invoice.currency}</span>
        </div>

        {Number(invoice.amountPaid) > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Paid</span>
            <span className="text-green-600 font-medium">-${Number(invoice.amountPaid).toFixed(2)}</span>
          </div>
        )}

        {outstanding > 0 && invoice.status !== 'paid' && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm font-bold dark:text-gray-100">
            <span>Outstanding</span>
            <span className="text-orange-600">${outstanding.toFixed(2)}</span>
          </div>
        )}
      </div>

      {invoice.notes && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{invoice.notes}</p>
        </div>
      )}

      {invoice.payments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Payment History</h2>
          </div>
          {invoice.payments.map((payment) => (
            <div key={payment.id} className="px-5 py-3 border-b border-gray-50 dark:border-gray-700 last:border-0 flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{new Date(payment.createdAt).toLocaleDateString()}</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">${Number(payment.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {payStatus === 'success' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-5">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{payMessage}</span>
          </div>
        </div>
      ) : canPay ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-5">
          {payStatus === 'form' && payInit && stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: payInit.clientSecret, appearance: { theme: 'stripe' } }}
            >
              {payMessage && <p className="text-red-600 dark:text-red-400 text-sm mb-3">{payMessage}</p>}
              <PaymentForm
                invoiceId={id!}
                paymentIntentId={payInit.paymentIntentId}
                onSuccess={(confirmedInvoice) => {
                  qc.setQueryData(['client', 'invoices', id], confirmedInvoice);
                  setPayStatus('success');
                  setPayMessage('Payment successful! Thank you.');
                }}
                onError={(msg) => {
                  setPayMessage(msg);
                }}
              />
            </Elements>
          ) : (
            <>
              {payMessage && <p className="text-red-600 dark:text-red-400 text-sm mb-3">{payMessage}</p>}
              <button
                onClick={openPaymentForm}
                disabled={payStatus === 'loading'}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" />
                {payStatus === 'loading' ? 'Loading...' : `Pay $${outstanding.toFixed(2)}`}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
