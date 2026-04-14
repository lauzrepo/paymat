import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, CreditCard } from 'lucide-react';
import { useFamilies, useCreateFamily } from '../../hooks/useFamilies';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/utils';

export function FamiliesPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', billingEmail: '' });
  const [addCard, setAddCard] = useState(false);
  const navigate = useNavigate();
  const families = useFamilies();
  const create = useCreateFamily();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const family = await create.mutateAsync({ name: form.name, billingEmail: form.billingEmail || undefined });
    setShowForm(false);
    setForm({ name: '', billingEmail: '' });
    setAddCard(false);
    navigate(`/families/${family.id}${addCard ? '?addCard=true' : ''}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Families</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Family
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New Family</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Family name" id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Billing email" id="billingEmail" type="email" value={form.billingEmail} onChange={(e) => setForm({ ...form, billingEmail: e.target.value })} />
              <div className="sm:col-span-2 flex items-center gap-2">
                <input id="addFamilyCard" type="checkbox" checked={addCard} onChange={(e) => setAddCard(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="addFamilyCard" className="text-sm text-gray-700 dark:text-gray-300">Add card on file after saving</label>
              </div>
              <div className="sm:col-span-2 flex gap-3 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={create.isPending}>Save</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <span className="text-sm text-gray-500 dark:text-gray-400">{families.data?.total ?? 0} families</span>
        </CardHeader>
        <CardBody className="p-0">
          {families.isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !families.data?.items.length ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No families yet.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {families.data.items.map((f) => (
                  <div key={f.id} className="px-4 py-3">
                    <Link to={`/families/${f.id}`} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {f.name}
                    </Link>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                      {f.billingEmail && <p>{f.billingEmail}</p>}
                      <p>{f.contacts?.length ?? 0} member{(f.contacts?.length ?? 0) !== 1 ? 's' : ''} · Added {formatDate(f.createdAt)}</p>
                      {f.stripeDefaultPaymentMethodId && (
                        <p className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                          <CreditCard className="h-3 w-3" /> Card on file
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Name</th>
                      <th className="px-6 py-3 text-left">Billing email</th>
                      <th className="px-6 py-3 text-left">Members</th>
                      <th className="px-6 py-3 text-left">Card</th>
                      <th className="px-6 py-3 text-left">Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {families.data.items.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-6 py-3 font-medium">
                          <Link to={`/families/${f.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{f.name}</Link>
                        </td>
                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{f.billingEmail ?? '—'}</td>
                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{f.contacts?.length ?? 0}</td>
                        <td className="px-6 py-3">
                          {f.stripeDefaultPaymentMethodId ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                              <CreditCard className="h-3 w-3" /> Saved
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{formatDate(f.createdAt)}</td>
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
