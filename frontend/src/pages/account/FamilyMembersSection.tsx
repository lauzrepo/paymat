import { useState } from 'react';
import { Baby, Plus } from 'lucide-react';
import { useChildren, useAddChild } from '../../hooks/useClient';

const inputClass =
  'w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export function FamilyMembersSection() {
  const { data: children, isLoading } = useChildren();
  const addChild = useAddChild();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', dateOfBirth: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addChild.mutateAsync({
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth || undefined,
      });
      setForm({ firstName: '', lastName: '', dateOfBirth: '' });
      setOpen(false);
    } catch {
      // error surfaced by mutation state
    }
  };

  const errorMessage = (addChild.error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Baby className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Children &amp; dependents</h2>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add a child
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        {isLoading && <p className="text-sm text-gray-400">Loading...</p>}
        {!isLoading && !children?.length && !open && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add your children here — they don&apos;t need their own email or login. You can enroll them in programs and pay for them from your account.
          </p>
        )}
        {children?.map((c) => (
          <div key={c.id} className="flex justify-between text-sm text-gray-900 dark:text-gray-100">
            <span>{c.firstName} {c.lastName}</span>
            {c.dateOfBirth && (
              <span className="text-gray-500 dark:text-gray-400">Born {new Date(c.dateOfBirth).toLocaleDateString()}</span>
            )}
          </div>
        ))}

        {open && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <input className={inputClass} placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            <input className={inputClass} placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date of birth (optional)</label>
              <input type="date" className={inputClass} value={form.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </div>
            {errorMessage && <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
              <button type="submit" disabled={addChild.isPending} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60">
                {addChild.isPending ? 'Adding…' : 'Add child'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
