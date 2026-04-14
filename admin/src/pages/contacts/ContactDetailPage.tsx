import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useContact, useDeactivateContact, useReactivateContact, useDeleteContact } from '../../hooks/useContacts';
import { initializeCardCheckout, saveCardToken } from '../../api/contacts';
import { queryClient } from '../../lib/queryClient';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatCurrency, formatDate } from '../../lib/utils';

const BILLING_FREQ_LABEL: Record<string, string> = {
  monthly: '/mo', weekly: '/wk', yearly: '/yr', one_time: ' one-time',
};

const INVOICE_STATUS_VARIANT: Record<string, 'green' | 'red' | 'gray' | 'blue' | 'yellow'> = {
  paid: 'green', overdue: 'red', draft: 'gray', sent: 'blue', void: 'gray',
};

// ── Stripe setup form ──────────────────────────────────────────────────────────

function CardSetupForm({
  contactId,
  customerId,
  onSuccess,
  onError,
  onCancel,
}: {
  contactId: string;
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
      await saveCardToken(contactId, customerId, paymentMethodId);
      queryClient.invalidateQueries({ queryKey: ['contacts', contactId] });
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

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading } = useContact(id!);
  const deactivate = useDeactivateContact();
  const reactivate = useReactivateContact();
  const remove = useDeleteContact();

  const [cardStatus, setCardStatus] = useState<'idle' | 'loading' | 'form' | 'success' | 'error'>('idle');
  const [cardMessage, setCardMessage] = useState('');
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [customerId, setCustomerId] = useState('');

  const openCardForm = async () => {
    setCardStatus('loading');
    setCardMessage('');
    try {
      const data = await initializeCardCheckout(id!);
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
    if (!window.confirm('Permanently delete this contact? This cannot be undone.\n\nNote: contacts with invoices or payments cannot be deleted — deactivate them instead.')) return;
    try {
      await remove.mutateAsync(contact!.id);
      navigate('/contacts');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Delete failed.';
      alert(msg);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!contact) return <p className="text-center py-20 text-gray-500 dark:text-gray-400">Contact not found.</p>;

  const hasCard = !!contact.stripeDefaultPaymentMethodId;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/contacts" className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {contact.firstName} {contact.lastName}
        </h1>
        <Badge variant={contact.status === 'active' ? 'green' : 'gray'}>{contact.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Profile</h2>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <Row label="Email" value={contact.email ?? '—'} />
              <Row label="Phone" value={contact.phone ?? '—'} />
              <Row label="Family" value={contact.family?.name ?? '—'} />
              <Row label="Date of birth" value={contact.dateOfBirth ? formatDate(contact.dateOfBirth) : '—'} />
              {contact.notes && <Row label="Notes" value={contact.notes} />}
              <Row label="Added" value={formatDate(contact.createdAt)} />
              <div className="flex justify-between items-center pt-1">
                <span className="text-gray-500 dark:text-gray-400">Card on file</span>
                {hasCard ? (
                  <span className="text-green-600 dark:text-green-400 text-xs font-medium flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Saved
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500 text-xs">None</span>
                )}
              </div>
              {cardStatus === 'success' && <p className="text-sm text-green-600 dark:text-green-400 font-medium">{cardMessage}</p>}
              {cardStatus === 'error' && <p className="text-sm text-red-600 dark:text-red-400">{cardMessage}</p>}
            </CardBody>
          </Card>

          {cardStatus === 'form' && stripePromise && clientSecret ? (
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Save card on file</h2></CardHeader>
              <CardBody>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CardSetupForm
                    contactId={id!}
                    customerId={customerId}
                    onSuccess={() => { setCardStatus('success'); setCardMessage('Card saved successfully.'); }}
                    onError={(msg) => { setCardStatus('error'); setCardMessage(msg); }}
                    onCancel={() => setCardStatus('idle')}
                  />
                </Elements>
              </CardBody>
            </Card>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={openCardForm} loading={cardStatus === 'loading'}>
                <CreditCard className="h-4 w-4 mr-1" />
                {hasCard ? 'Replace card' : 'Save card on file'}
              </Button>
              {contact.status === 'active' ? (
                <Button variant="danger" size="sm" loading={deactivate.isPending} onClick={() => deactivate.mutate(contact.id)}>
                  Deactivate contact
                </Button>
              ) : (
                <Button variant="secondary" size="sm" loading={reactivate.isPending} onClick={() => reactivate.mutate(contact.id)}>
                  Reactivate contact
                </Button>
              )}
              <Button variant="ghost" size="sm" loading={remove.isPending} onClick={handleDelete} className="text-red-500 hover:text-red-700">
                Delete permanently
              </Button>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Enrollments */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Enrollments</h2>
            </CardHeader>
            <CardBody className="p-0">
              {!contact.enrollments?.length ? (
                <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">No enrollments.</p>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                    {contact.enrollments.map((e) => (
                      <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{e.program.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatCurrency(e.program.price)}{BILLING_FREQ_LABEL[e.program.billingFrequency] ?? ''} · Since {formatDate(e.startDate)}
                          </p>
                        </div>
                        <Badge variant={e.status === 'active' ? 'green' : e.status === 'paused' ? 'yellow' : 'gray'}>
                          {e.status}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
                        <tr>
                          <th className="px-6 py-3 text-left">Program</th>
                          <th className="px-6 py-3 text-left">Price</th>
                          <th className="px-6 py-3 text-left">Status</th>
                          <th className="px-6 py-3 text-left">Since</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {contact.enrollments.map((e) => (
                          <tr key={e.id}>
                            <td className="px-6 py-3 font-medium dark:text-gray-100">{e.program.name}</td>
                            <td className="px-6 py-3 dark:text-gray-100">
                              {formatCurrency(e.program.price)}{BILLING_FREQ_LABEL[e.program.billingFrequency] ?? ''}
                            </td>
                            <td className="px-6 py-3">
                              <Badge variant={e.status === 'active' ? 'green' : e.status === 'paused' ? 'yellow' : 'gray'}>
                                {e.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{formatDate(e.startDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Invoices */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Recent Invoices</h2>
              <Link to={`/invoices?contactId=${contact.id}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                View all
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {!contact.invoices?.length ? (
                <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">No invoices.</p>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                    {contact.invoices.map((inv) => (
                      <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <Link to={`/invoices/${inv.id}`} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            {inv.invoiceNumber}
                          </Link>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {formatCurrency(inv.amountDue)} · Due {formatDate(inv.dueDate)}
                          </p>
                        </div>
                        <Badge variant={INVOICE_STATUS_VARIANT[inv.status] ?? 'gray'}>{inv.status}</Badge>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
                        <tr>
                          <th className="px-6 py-3 text-left">Invoice</th>
                          <th className="px-6 py-3 text-left">Amount</th>
                          <th className="px-6 py-3 text-left">Status</th>
                          <th className="px-6 py-3 text-left">Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {contact.invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="px-6 py-3">
                              <Link to={`/invoices/${inv.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                                {inv.invoiceNumber}
                              </Link>
                            </td>
                            <td className="px-6 py-3 font-medium dark:text-gray-100">{formatCurrency(inv.amountDue)}</td>
                            <td className="px-6 py-3">
                              <Badge variant={INVOICE_STATUS_VARIANT[inv.status] ?? 'gray'}>{inv.status}</Badge>
                            </td>
                            <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{formatDate(inv.dueDate)}</td>
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
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-gray-900 dark:text-gray-100 font-medium text-right max-w-xs truncate">{value}</span>
    </div>
  );
}
