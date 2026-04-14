import { useState } from 'react';
import { Plus } from 'lucide-react';
import { usePrograms, useCreateProgram, useUpdateProgram, useDeleteProgram } from '../../hooks/usePrograms';
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
    maxBillingCycles: String(initial?.maxBillingCycles ?? ''),
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
      maxBillingCycles: form.maxBillingCycles ? parseInt(form.maxBillingCycles) : undefined,
      isActive: form.isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input label="Program name" id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Input label="Price ($)" id="price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing frequency</label>
        <select
          value={form.billingFrequency}
          onChange={(e) => setForm({ ...form, billingFrequency: e.target.value })}
          className="appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
          <option value="yearly">Yearly</option>
          <option value="one_time">One-time</option>
        </select>
      </div>
      <Input label="Capacity (optional)" id="capacity" type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
      <Input
        label="Max payments (optional)"
        id="maxBillingCycles"
        type="number"
        min="1"
        value={form.maxBillingCycles}
        onChange={(e) => setForm({ ...form, maxBillingCycles: e.target.value })}
        placeholder="Leave blank to bill indefinitely"
      />
      <div className="sm:col-span-2">
        <Input label="Description (optional)" id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="sm:col-span-2 flex gap-3 justify-end">
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
  const deleteProgram = useDeleteProgram();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Programs</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Program
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New Program</h2></CardHeader>
          <CardBody>
            <ProgramForm
              onSave={async (data) => { await create.mutateAsync(data); setShowForm(false); }}
              onCancel={() => setShowForm(false)}
              loading={create.isPending}
            />
          </CardBody>
        </Card>
      )}

      {/* Inline edit form on mobile (shown above the list) */}
      {editingId && (
        <div className="md:hidden">
          <Card>
            <CardHeader><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Edit Program</h2></CardHeader>
            <CardBody>
              <EditRow
                program={programs.data!.items.find((p) => p.id === editingId)!}
                onDone={() => setEditingId(null)}
              />
            </CardBody>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <span className="text-sm text-gray-500 dark:text-gray-400">{programs.data?.total ?? 0} programs</span>
        </CardHeader>
        <CardBody className="p-0">
          {programs.isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !programs.data?.items.length ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No programs yet.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {programs.data.items.map((p) => (
                  <div key={p.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                      <Badge variant={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(p.price)} · {FREQ_LABELS[p.billingFrequency] ?? p.billingFrequency}
                      {p.capacity ? ` · ${p._count?.enrollments ?? 0}/${p.capacity} enrolled` : ` · ${p._count?.enrollments ?? 0} enrolled`}
                    </p>
                    {p.description && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.description}</p>}
                    <div className="flex gap-2 pt-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(p.id)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700"
                        loading={deleteProgram.isPending}
                        onClick={() => { if (window.confirm(`Delete "${p.name}"? This cannot be undone.`)) deleteProgram.mutate(p.id); }}>
                        Delete
                      </Button>
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
                      <th className="px-6 py-3 text-left">Price</th>
                      <th className="px-6 py-3 text-left">Frequency</th>
                      <th className="px-6 py-3 text-left">Enrolled</th>
                      <th className="px-6 py-3 text-left">Payments</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {programs.data.items.map((p) =>
                      editingId === p.id ? (
                        <tr key={p.id}>
                          <td colSpan={7} className="px-6 py-4">
                            <EditRow program={p} onDone={() => setEditingId(null)} />
                          </td>
                        </tr>
                      ) : (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-6 py-3 font-medium dark:text-gray-100">
                            <div>{p.name}</div>
                            {p.description && <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs">{p.description}</div>}
                          </td>
                          <td className="px-6 py-3 dark:text-gray-100">{formatCurrency(p.price)}</td>
                          <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{FREQ_LABELS[p.billingFrequency] ?? p.billingFrequency}</td>
                          <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                            {p._count?.enrollments ?? 0}{p.capacity ? ` / ${p.capacity}` : ''}
                          </td>
                          <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                            {p.maxBillingCycles ? p.maxBillingCycles : <span className="text-gray-400 dark:text-gray-500">Ongoing</span>}
                          </td>
                          <td className="px-6 py-3">
                            <Badge variant={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setEditingId(p.id)}>Edit</Button>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700"
                                loading={deleteProgram.isPending}
                                onClick={() => { if (window.confirm(`Delete "${p.name}"? This cannot be undone.`)) deleteProgram.mutate(p.id); }}>
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
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
