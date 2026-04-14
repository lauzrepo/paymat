import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, Pencil } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useFamily, useDeleteFamily, useUpdateFamily } from '../../hooks/useFamilies';
import { initializeFamilyCardCheckout, saveFamilyCardToken } from '../../api/families';
import { queryClient } from '../../lib/queryClient';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
  const updateFamily = useUpdateFamily(id!);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', billingEmail: '' });
  const [editError, setEditError] = useState('');

  const startEdit = () => {
    setEditForm({ name: family!.name, billingEmail: family!.billingEmail ?? '' });
    setEditError('');
    setEditing(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    try {
      await updateFamily.mutateAsync({ name: editForm.name, billingEmail: editForm.billingEmail || undefined });
      setEditing(false);
    } catch {
      setEditError('Failed to save. Please try again.');
    }
  };

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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCardStatus('error');
      setCardMessage(msg ?? 'Could not initialize card form. Check your Stripe configuration.');
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
  if (!family) return <p className="text-center text-gray-500 dark:text-gray-400 py-20">Family not found.</p>;

  const hasCard = !!family.stripeDefaultPaymentMethodId;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/families" className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{family.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Family info</h2>
            <div className="flex gap-2">
              {!editing && (
                <Button variant="secondary" size="sm" onClick={startEdit}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
              )}
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
          {editing ? (
            <form onSubmit={handleEditSave} className="space-y-3">
              <Input label="Family name" id="name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
              <Input label="Billing email (optional)" id="billingEmail" type="email" value={editForm.billingEmail} onChange={(e) => setEditForm({ ...editForm, billingEmail: e.target.value })} />
              {editError && <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={updateFamily.isPending}>Save</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Billing email</span>
                <span className="text-gray-800 dark:text-gray-200">{family.billingEmail ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Card on file</span>
                {hasCard ? (
                  <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Saved
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">None</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Added</span>
                <span className="text-gray-800 dark:text-gray-200">{formatDate(family.createdAt)}</span>
              </div>
            </>
          )}
          {cardStatus === 'success' && <p className="text-sm text-green-600 dark:text-green-400 font-medium">{cardMessage}</p>}
          {cardStatus === 'error' && <p className="text-sm text-red-600 dark:text-red-400">{cardMessage}</p>}
        </CardBody>
      </Card>

      {cardStatus === 'form' && stripePromise && clientSecret && (
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Save card on file</h2></CardHeader>
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
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Members</h2>
        </CardHeader>
        <CardBody className="p-0">
          {!family.contacts?.length ? (
            <p className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No members yet.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {family.contacts.map((c) => (
                  <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <Link to={`/contacts/${c.id}`} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {c.firstName} {c.lastName}
                    </Link>
                    <Badge variant={c.status === 'active' ? 'green' : 'gray'}>{c.status}</Badge>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Name</th>
                      <th className="px-6 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {family.contacts.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-6 py-3 font-medium">
                          <Link to={`/contacts/${c.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
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
