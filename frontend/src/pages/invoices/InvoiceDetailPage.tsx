import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ChevronLeft, CreditCard, CheckCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useMyInvoice, useInitializeInvoicePayment } from '../../hooks/useClient';
import { useQueryClient } from '@tanstack/react-query';
import type { PaymentInitData } from '../../api/client';
import { useOrgSlug } from '../../context/OrgSlugContext';

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-400',
};

// ── Stripe payment form (rendered inside <Elements>) ──────────────────────────

function PaymentForm({ onSuccess, onError }: { onSuccess: () => void; onError: (msg: string) => void }) {
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
    } else {
      onSuccess();
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
    const paymentIntent = searchParams.get('payment_intent');
    const status = searchParams.get('redirect_status');
    if (paymentIntent && status === 'succeeded') {
      setPayStatus('success');
      setPayMessage('Payment successful! Thank you.');
      qc.invalidateQueries({ queryKey: ['client', 'invoices', id] });
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
        <Link to={`/${orgSlug}/invoices`} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{invoice.invoiceNumber}</h1>
            <p className="text-xs text-gray-500 mt-0.5">Due {new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[invoice.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </span>
        </div>

        <div className="px-5 py-4 space-y-2">
          {invoice.lineItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{item.description}</span>
              <span className="text-gray-900 font-medium">${Number(item.total).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-sm font-semibold">
          <span>Total</span>
          <span>${Number(invoice.amountDue).toFixed(2)} {invoice.currency}</span>
        </div>

        {Number(invoice.amountPaid) > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">Paid</span>
            <span className="text-green-600 font-medium">-${Number(invoice.amountPaid).toFixed(2)}</span>
          </div>
        )}

        {outstanding > 0 && invoice.status !== 'paid' && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm font-bold">
            <span>Outstanding</span>
            <span className="text-orange-600">${outstanding.toFixed(2)}</span>
          </div>
        )}
      </div>

      {invoice.notes && (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-700">{invoice.notes}</p>
        </div>
      )}

      {invoice.payments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Payment History</h2>
          </div>
          {invoice.payments.map((payment) => (
            <div key={payment.id} className="px-5 py-3 border-b border-gray-50 last:border-0 flex items-center justify-between text-sm">
              <span className="text-gray-600">{new Date(payment.createdAt).toLocaleDateString()}</span>
              <span className="font-medium text-gray-900">${Number(payment.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {canPay && (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5">
          {payStatus === 'success' ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{payMessage}</span>
            </div>
          ) : payStatus === 'form' && payInit && stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: payInit.clientSecret, appearance: { theme: 'stripe' } }}
            >
              {payMessage && <p className="text-red-600 text-sm mb-3">{payMessage}</p>}
              <PaymentForm
                onSuccess={() => {
                  setPayStatus('success');
                  setPayMessage('Payment successful! Thank you.');
                  qc.invalidateQueries({ queryKey: ['client', 'invoices', id] });
                }}
                onError={(msg) => {
                  setPayMessage(msg);
                }}
              />
            </Elements>
          ) : (
            <>
              {payMessage && <p className="text-red-600 text-sm mb-3">{payMessage}</p>}
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
      )}
    </div>
  );
}
