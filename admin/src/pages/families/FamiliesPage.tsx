import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Families</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Family
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">New Family</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <Input label="Family name" id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Billing email" id="billingEmail" type="email" value={form.billingEmail} onChange={(e) => setForm({ ...form, billingEmail: e.target.value })} />
              <div className="col-span-2 flex items-center gap-2">
                <input id="addFamilyCard" type="checkbox" checked={addCard} onChange={(e) => setAddCard(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="addFamilyCard" className="text-sm text-gray-700">Add card on file after saving</label>
              </div>
              <div className="col-span-2 flex gap-3 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={create.isPending}>Save</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <span className="text-sm text-gray-500">{families.data?.total ?? 0} families</span>
        </CardHeader>
        <CardBody className="p-0">
          {families.isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !families.data?.items.length ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500">No families yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Billing email</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Members</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {families.data.items.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        <Link to={`/families/${f.id}`} className="text-indigo-600 hover:underline">
                          {f.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{f.billingEmail ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{f.contacts?.length ?? 0}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(f.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
