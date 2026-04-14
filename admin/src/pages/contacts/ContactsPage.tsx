import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, CreditCard } from 'lucide-react';
import { useContacts, useCreateContact, useDeactivateContact, useReactivateContact, useDeleteContact } from '../../hooks/useContacts';
import { useFamilies } from '../../hooks/useFamilies';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/utils';

export function ContactsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', familyId: '' });
  const [addCard, setAddCard] = useState(false);
  const navigate = useNavigate();
  const create = useCreateContact();
  const deactivate = useDeactivateContact();
  const reactivate = useReactivateContact();
  const remove = useDeleteContact();
  const families = useFamilies();

  const contacts = useContacts({ search: search || undefined, status: status || undefined });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const contact = await create.mutateAsync({ ...form, familyId: form.familyId || undefined });
    setShowForm(false);
    setForm({ firstName: '', lastName: '', email: '', phone: '', familyId: '' });
    setAddCard(false);
    navigate(`/contacts/${contact.id}${addCard ? '?addCard=true' : ''}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contacts</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Contact
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New Contact</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="First name" id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              <Input label="Last name" id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              <Input label="Email" id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label="Phone" id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Family (optional)</label>
                <select
                  value={form.familyId}
                  onChange={(e) => setForm({ ...form, familyId: e.target.value })}
                  className="appearance-none bg-white dark:bg-gray-800 dark:text-gray-100 w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No family</option>
                  {families.data?.items.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input id="addCard" type="checkbox" checked={addCard} onChange={(e) => setAddCard(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="addCard" className="text-sm text-gray-700 dark:text-gray-300">Add card on file after saving</label>
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-0 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-800 dark:text-gray-100 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">{contacts.data?.total ?? 0} contacts</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {contacts.isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !contacts.data?.items.length ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No contacts found.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {contacts.data.items.map((c) => (
                  <div key={c.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Link to={`/contacts/${c.id}`} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        {c.firstName} {c.lastName}
                      </Link>
                      <Badge variant={c.status === 'active' ? 'green' : 'gray'}>{c.status}</Badge>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      {c.email && <p>{c.email}</p>}
                      {c.family?.name && <p>Family: {c.family.name}</p>}
                      <p>Added {formatDate(c.createdAt)}</p>
                      {c.stripeDefaultPaymentMethodId && (
                        <p className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                          <CreditCard className="h-3 w-3" /> Card on file
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      {c.status === 'active' ? (
                        <Button variant="ghost" size="sm" onClick={() => deactivate.mutate(c.id)}>Deactivate</Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => reactivate.mutate(c.id)}>Reactivate</Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={async () => {
                        if (!window.confirm(`Delete ${c.firstName} ${c.lastName} permanently?`)) return;
                        try { await remove.mutateAsync(c.id); } catch (err: unknown) {
                          alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Delete failed.');
                        }
                      }}>Delete</Button>
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
                      <th className="px-6 py-3 text-left">Email</th>
                      <th className="px-6 py-3 text-left">Family</th>
                      <th className="px-6 py-3 text-left">Card</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Added</th>
                      <th className="px-6 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {contacts.data.items.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-6 py-3 font-medium">
                          <Link to={`/contacts/${c.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                            {c.firstName} {c.lastName}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{c.email ?? '—'}</td>
                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{c.family?.name ?? '—'}</td>
                        <td className="px-6 py-3">
                          {c.stripeDefaultPaymentMethodId ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                              <CreditCard className="h-3 w-3" /> Saved
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={c.status === 'active' ? 'green' : 'gray'}>{c.status}</Badge>
                        </td>
                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{formatDate(c.createdAt)}</td>
                        <td className="px-6 py-3">
                          <div className="flex gap-1">
                            {c.status === 'active' ? (
                              <Button variant="ghost" size="sm" onClick={() => deactivate.mutate(c.id)}>Deactivate</Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => reactivate.mutate(c.id)}>Reactivate</Button>
                            )}
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={async () => {
                              if (!window.confirm(`Delete ${c.firstName} ${c.lastName} permanently?`)) return;
                              try { await remove.mutateAsync(c.id); } catch (err: unknown) {
                                alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Delete failed.');
                              }
                            }}>Delete</Button>
                          </div>
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
