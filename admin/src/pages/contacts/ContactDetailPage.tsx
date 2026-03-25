import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, CreditCard } from 'lucide-react';
import { useContact, useDeactivateContact, useReactivateContact, useDeleteContact } from '../../hooks/useContacts';
import { initializeCardCheckout, saveCardToken } from '../../api/contacts';
import { queryClient } from '../../lib/queryClient';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatCurrency, formatDate } from '../../lib/utils';

const BILLING_FREQ_LABEL: Record<string, string> = {
  monthly: '/mo',
  weekly: '/wk',
  yearly: '/yr',
  one_time: ' one-time',
};

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: contact, isLoading } = useContact(id!);
  const deactivate = useDeactivateContact();
  const reactivate = useReactivateContact();
  const remove = useDeleteContact();
  const [cardStatus, setCardStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cardMessage, setCardMessage] = useState('');

  const openCardForm = async () => {
    setCardStatus('loading');
    setCardMessage('');
    try {
      const { checkoutToken } = await initializeCardCheckout(id!);
      if (!document.getElementById('helcim-pay-js')) {
        const script = document.createElement('script');
        script.id = 'helcim-pay-js';
        script.src = 'https://secure.helcim.app/helcim-pay/services/start.js';
        script.onload = () => {
          setCardStatus('idle');
          // @ts-expect-error HelcimPay global injected by script
          window.appendHelcimIframe?.(checkoutToken);
        };
        document.body.appendChild(script);
      } else {
        setCardStatus('idle');
        // @ts-expect-error HelcimPay global injected by script
        window.appendHelcimIframe?.(checkoutToken);
      }
    } catch {
      setCardStatus('error');
      setCardMessage('Could not initialize card form. Check your Helcim API token.');
    }
  };

  useEffect(() => {
    if (searchParams.get('addCard') === 'true' && contact) {
      openCardForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact]);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.eventType === 'HELCIM_PAY_JS_SUCCESS') {
          const cardToken: string = data.eventMessage?.data?.cardToken ?? data.eventMessage?.cardToken;
          if (!cardToken) return;
          await saveCardToken(id!, cardToken);
          queryClient.invalidateQueries({ queryKey: ['contacts', id] });
          setCardStatus('success');
          setCardMessage('Card saved successfully.');
        } else if (data.eventType === 'HELCIM_PAY_JS_FAILED') {
          setCardStatus('error');
          setCardMessage(data.eventMessage ?? 'Card capture failed.');
        }
      } catch {
        // not a relevant message
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [id]);

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
  if (!contact) return <p className="text-center py-20 text-gray-500">Contact not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/contacts" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {contact.firstName} {contact.lastName}
        </h1>
        <Badge variant={contact.status === 'active' ? 'green' : 'gray'}>{contact.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900">Profile</h2>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <Row label="Email" value={contact.email ?? '—'} />
              <Row label="Phone" value={contact.phone ?? '—'} />
              <Row label="Family" value={contact.family?.name ?? '—'} />
              <Row label="Date of birth" value={contact.dateOfBirth ? formatDate(contact.dateOfBirth) : '—'} />
              {contact.notes && <Row label="Notes" value={contact.notes} />}
              <Row label="Added" value={formatDate(contact.createdAt)} />
              <div className="flex justify-between items-center pt-1">
                <span className="text-gray-500">Card on file</span>
                {contact.helcimToken ? (
                  <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Saved
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">None</span>
                )}
              </div>
              {cardStatus === 'success' && (
                <p className="text-sm text-green-600 font-medium">{cardMessage}</p>
              )}
              {cardStatus === 'error' && (
                <p className="text-sm text-red-600">{cardMessage}</p>
              )}
            </CardBody>
          </Card>

          <div className="flex flex-col gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={openCardForm} loading={cardStatus === 'loading'}>
              <CreditCard className="h-4 w-4 mr-1" />
              {contact.helcimToken ? 'Replace card' : 'Save card on file'}
            </Button>

            {contact.status === 'active' ? (
              <Button
                variant="danger"
                size="sm"
                loading={deactivate.isPending}
                onClick={() => deactivate.mutate(contact.id)}
              >
                Deactivate contact
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                loading={reactivate.isPending}
                onClick={() => reactivate.mutate(contact.id)}
              >
                Reactivate contact
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              loading={remove.isPending}
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700"
            >
              Delete permanently
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900">Enrollments</h2>
            </CardHeader>
            <CardBody className="p-0">
              {!contact.enrollments?.length ? (
                <p className="px-6 py-6 text-sm text-gray-500">No enrollments.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Program</th>
                      <th className="px-6 py-3 text-left">Price</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {contact.enrollments.map((e) => (
                      <tr key={e.id}>
                        <td className="px-6 py-3 font-medium">{e.program.name}</td>
                        <td className="px-6 py-3">
                          {formatCurrency(e.program.price)}{BILLING_FREQ_LABEL[e.program.billingFrequency] ?? ''}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={e.status === 'active' ? 'green' : e.status === 'paused' ? 'yellow' : 'gray'}>
                            {e.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-gray-500">{formatDate(e.startDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Recent Invoices</h2>
              <Link to={`/invoices?contactId=${contact.id}`} className="text-sm text-indigo-600 hover:text-indigo-500">
                View all
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {!contact.invoices?.length ? (
                <p className="px-6 py-6 text-sm text-gray-500">No invoices.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Invoice</th>
                      <th className="px-6 py-3 text-left">Amount</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {contact.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="px-6 py-3">
                          <Link to={`/invoices/${inv.id}`} className="text-indigo-600 hover:underline font-medium">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-3 font-medium">{formatCurrency(inv.amountDue)}</td>
                        <td className="px-6 py-3">
                          <InvoiceStatusBadge status={inv.status} />
                        </td>
                        <td className="px-6 py-3 text-gray-500">{formatDate(inv.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right max-w-xs truncate">{value}</span>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, 'green' | 'red' | 'gray' | 'blue' | 'yellow'> = {
    paid: 'green', overdue: 'red', draft: 'gray', sent: 'blue', void: 'gray',
  };
  return <Badge variant={map[status] ?? 'gray'}>{status}</Badge>;
}
