import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, CreditCard, X } from 'lucide-react';
import { useFamily } from '../../hooks/useFamilies';
import { initializeFamilyCardCheckout, saveFamilyCardToken } from '../../api/families';
import { queryClient } from '../../lib/queryClient';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/utils';

export function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { data: family, isLoading } = useFamily(id!);
  const [cardModal, setCardModal] = useState(false);
  const [cardStatus, setCardStatus] = useState<'idle' | 'loading' | 'ready' | 'success' | 'error'>('idle');
  const [cardMessage, setCardMessage] = useState('');
  const helcimContainerRef = useRef<HTMLDivElement>(null);

  const openCardModal = async () => {
    setCardModal(true);
    setCardStatus('loading');
    setCardMessage('');
    try {
      const { checkoutToken } = await initializeFamilyCardCheckout(id!);
      setCardStatus('ready');
      if (!document.getElementById('helcim-pay-js')) {
        const script = document.createElement('script');
        script.id = 'helcim-pay-js';
        script.src = 'https://secure.helcim.app/helcim-pay/services/start.js';
        script.onload = () => {
          // @ts-expect-error HelcimPay global
          window.appendHelcimIframe?.(checkoutToken);
        };
        document.body.appendChild(script);
      } else {
        // @ts-expect-error HelcimPay global
        window.appendHelcimIframe?.(checkoutToken);
      }
    } catch {
      setCardStatus('error');
      setCardMessage('Could not initialize card form. Check your Helcim API token.');
    }
  };

  useEffect(() => {
    if (searchParams.get('addCard') === 'true' && family) {
      openCardModal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family]);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (!cardModal) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.eventType === 'HELCIM_PAY_JS_SUCCESS') {
          const cardToken: string = data.eventMessage?.data?.cardToken ?? data.eventMessage?.cardToken;
          if (!cardToken) return;
          await saveFamilyCardToken(id!, cardToken);
          queryClient.invalidateQueries({ queryKey: ['families', id] });
          setCardStatus('success');
          setCardMessage('Card saved for this family.');
          setTimeout(() => setCardModal(false), 1500);
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
  }, [cardModal, id]);

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!family) return <p className="text-center text-gray-500 py-20">Family not found.</p>;

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
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Family info</h2>
            <Button variant="secondary" size="sm" onClick={openCardModal}>
              <CreditCard className="h-4 w-4 mr-1" />
              {family.helcimToken ? 'Replace card' : 'Save card on file'}
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Billing email</span>
            <span className="text-gray-800">{family.billingEmail ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Card on file</span>
            {family.helcimToken ? (
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
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">Members</h2>
        </CardHeader>
        <CardBody className="p-0">
          {!family.contacts?.length ? (
            <p className="px-6 py-8 text-center text-sm text-gray-500">No members yet.</p>
          ) : (
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
          )}
        </CardBody>
      </Card>

      {cardModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Save card on file — {family.name}</h2>
              <button onClick={() => setCardModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {cardStatus === 'loading' && (
              <p className="text-sm text-gray-500 text-center py-8">Loading card form…</p>
            )}
            {cardStatus === 'success' && (
              <p className="text-sm text-green-600 text-center py-8">{cardMessage}</p>
            )}
            {cardStatus === 'error' && (
              <p className="text-sm text-red-600 text-center py-8">{cardMessage}</p>
            )}
            <div ref={helcimContainerRef} id="helcim-pay-manifest" style={{ minHeight: '400px' }} />
            <p className="text-xs text-gray-400 mt-3 text-center">
              This card will be used for all members of this family who don't have their own card on file.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
