import { useState } from 'react';
import { Plus } from 'lucide-react';
import { usePrograms, useCreateProgram, useUpdateProgram } from '../../hooks/usePrograms';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatCurrency } from '../../lib/utils';
import type { Program } from '../../types/program';

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Monthly', weekly: 'Weekly', yearly: 'Yearly', one_time: 'One-time',
};

function ProgramForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial?: Partial<Program>;
  onSave: (data: Partial<Program>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    price: String(initial?.price ?? ''),
    billingFrequency: initial?.billingFrequency ?? 'monthly',
    capacity: String(initial?.capacity ?? ''),
    isActive: initial?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price),
      billingFrequency: form.billingFrequency,
      capacity: form.capacity ? parseInt(form.capacity) : undefined,
      isActive: form.isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
      <Input label="Program name" id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Input label="Price ($)" id="price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Billing frequency</label>
        <select
          value={form.billingFrequency}
          onChange={(e) => setForm({ ...form, billingFrequency: e.target.value })}
          className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
          <option value="yearly">Yearly</option>
          <option value="one_time">One-time</option>
        </select>
      </div>
      <Input label="Capacity (optional)" id="capacity" type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
      <div className="col-span-2">
        <Input label="Description (optional)" id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="col-span-2 flex gap-3 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}

function EditRow({ program, onDone }: { program: Program; onDone: () => void }) {
  const update = useUpdateProgram(program.id);
  return (
    <ProgramForm
      initial={program}
      onSave={async (data) => { await update.mutateAsync(data); onDone(); }}
      onCancel={onDone}
      loading={update.isPending}
    />
  );
}

export function ProgramsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const programs = usePrograms();
  const create = useCreateProgram();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Program
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-gray-900">New Program</h2></CardHeader>
          <CardBody>
            <ProgramForm
              onSave={async (data) => { await create.mutateAsync(data); setShowForm(false); }}
              onCancel={() => setShowForm(false)}
              loading={create.isPending}
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <span className="text-sm text-gray-500">{programs.data?.total ?? 0} programs</span>
        </CardHeader>
        <CardBody className="p-0">
          {programs.isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !programs.data?.items.length ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500">No programs yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Price</th>
                  <th className="px-6 py-3 text-left">Frequency</th>
                  <th className="px-6 py-3 text-left">Enrolled</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {programs.data.items.map((p) =>
                  editingId === p.id ? (
                    <tr key={p.id}>
                      <td colSpan={6} className="px-6 py-4">
                        <EditRow program={p} onDone={() => setEditingId(null)} />
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">
                        <div>{p.name}</div>
                        {p.description && <div className="text-xs text-gray-400 truncate max-w-xs">{p.description}</div>}
                      </td>
                      <td className="px-6 py-3">{formatCurrency(p.price)}</td>
                      <td className="px-6 py-3 text-gray-600">{FREQ_LABELS[p.billingFrequency] ?? p.billingFrequency}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {p._count?.enrollments ?? 0}{p.capacity ? ` / ${p.capacity}` : ''}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(p.id)}>Edit</Button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
