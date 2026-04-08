import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useFamily, useDeleteFamily } from '../../hooks/useFamilies';
import { initializeFamilyCardCheckout, saveFamilyCardToken } from '../../api/families';
import { queryClient } from '../../lib/queryClient';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/utils';

// ── Stripe setup form ──────────────────────────────────────────────────────────

function CardSetupForm({
  familyId,
  customerId,
  onSuccess,
  onError,
  onCancel,
}: {
  familyId: string;
  customerId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { setupIntent, error } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (error) {
      onError(error.message ?? 'Card setup failed. Please try again.');
      setSubmitting(false);
      return;
    }
    const paymentMethodId = typeof setupIntent?.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent?.payment_method?.id;
    if (!paymentMethodId) {
      onError('Card setup succeeded but payment method could not be retrieved.');
      setSubmitting(false);
      return;
    }
    try {
      await saveFamilyCardToken(familyId, customerId, paymentMethodId);
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      onSuccess();
    } catch {
      onError('Card captured but failed to save. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex gap-2">
        <Button type="submit" loading={submitting} disabled={!stripe}>Save card</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: family, isLoading } = useFamily(id!);
  const deleteFamily = useDeleteFamily();

  const [cardStatus, setCardStatus] = useState<'idle' | 'loading' | 'form' | 'success' | 'error'>('idle');
  const [cardMessage, setCardMessage] = useState('');
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [customerId, setCustomerId] = useState('');

  const openCardForm = async () => {
    setCardStatus('loading');
    setCardMessage('');
    try {
      const data = await initializeFamilyCardCheckout(id!);
      const promise = loadStripe(data.publishableKey, { stripeAccount: data.connectAccountId });
      setStripePromise(promise);
      setClientSecret(data.clientSecret);
      setCustomerId(data.customerId);
      setCardStatus('form');
    } catch {
      setCardStatus('error');
      setCardMessage('Could not initialize card form. Check your Stripe configuration.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Permanently delete this family? Members will be unlinked but not deleted.')) return;
    try {
      await deleteFamily.mutateAsync(family!.id);
      navigate('/families');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Delete failed.';
      alert(msg);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!family) return <p className="text-center text-gray-500 py-20">Family not found.</p>;

  const hasCard = !!family.stripeDefaultPaymentMethodId;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/families" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{family.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-gray-900">Family info</h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={openCardForm} loading={cardStatus === 'loading'}>
                <CreditCard className="h-4 w-4 mr-1" />
                {hasCard ? 'Replace card' : 'Save card on file'}
              </Button>
              <Button variant="danger" size="sm" loading={deleteFamily.isPending} onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Billing email</span>
            <span className="text-gray-800">{family.billingEmail ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Card on file</span>
            {hasCard ? (
              <span className="text-green-600 font-medium flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Saved
              </span>
            ) : (
              <span className="text-gray-400">None</span>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Added</span>
            <span className="text-gray-800">{formatDate(family.createdAt)}</span>
          </div>
          {cardStatus === 'success' && <p className="text-sm text-green-600 font-medium">{cardMessage}</p>}
          {cardStatus === 'error' && <p className="text-sm text-red-600">{cardMessage}</p>}
        </CardBody>
      </Card>

      {cardStatus === 'form' && stripePromise && clientSecret && (
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-gray-900">Save card on file</h2></CardHeader>
          <CardBody>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CardSetupForm
                familyId={id!}
                customerId={customerId}
                onSuccess={() => { setCardStatus('success'); setCardMessage('Card saved for this family.'); }}
                onError={(msg) => { setCardStatus('error'); setCardMessage(msg); }}
                onCancel={() => setCardStatus('idle')}
              />
            </Elements>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">Members</h2>
        </CardHeader>
        <CardBody className="p-0">
          {!family.contacts?.length ? (
            <p className="px-6 py-8 text-center text-sm text-gray-500">No members yet.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {family.contacts.map((c) => (
                  <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <Link to={`/contacts/${c.id}`} className="text-sm font-semibold text-indigo-600">
                      {c.firstName} {c.lastName}
                    </Link>
                    <Badge variant={c.status === 'active' ? 'green' : 'gray'}>{c.status}</Badge>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Name</th>
                      <th className="px-6 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {family.contacts.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium">
                          <Link to={`/contacts/${c.id}`} className="text-indigo-600 hover:underline">
                            {c.firstName} {c.lastName}
                          </Link>
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={c.status === 'active' ? 'green' : 'gray'}>{c.status}</Badge>
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
    </div>
  );
}
