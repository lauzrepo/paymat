import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useProgramTemplates, useApplyProgramTemplate } from '../../hooks/usePrograms';
import type { ApplyTemplateResult, TemplateProgram } from '../../api/programs';
import { buildApplyPayload, groupByKind, initialSelection, type SelectionState } from '../../lib/programTemplates';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Monthly', weekly: 'Weekly', yearly: 'Yearly', one_time: 'One-time',
};

const fieldClass =
  'block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm px-3 py-1.5 focus:border-indigo-500 focus:ring-indigo-500';

function describe(program: TemplateProgram) {
  const parts = [FREQ_LABELS[program.billingFrequency] ?? program.billingFrequency];
  if (program.maxClasses) parts.push(`${program.maxClasses} ${program.maxClasses === 1 ? 'class' : 'classes'}`);
  return parts.join(' · ');
}

function errorMessage(err: unknown) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong. Please try again.';
}

function PickerBody({ onClose }: { onClose: () => void }) {
  const templates = useProgramTemplates();
  const apply = useApplyProgramTemplate();

  const [chosen, setChosen] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, SelectionState>>({});
  const [result, setResult] = useState<ApplyTemplateResult | null>(null);

  // An org with an industry set only gets its own template back, so it opens straight away.
  const data = templates.data;
  const activeIndustry = chosen ?? data?.industry ?? null;
  const template = data?.templates.find((t) => t.industry === activeIndustry);
  const selection: SelectionState = template ? (edits[template.industry] ?? initialSelection(template)) : {};
  const built = template ? buildApplyPayload(template, selection) : null;

  const update = (key: string, patch: Partial<SelectionState[string]>) => {
    if (!template) return;
    setEdits((e) => ({
      ...e,
      [template.industry]: { ...selection, [key]: { ...selection[key], ...patch } },
    }));
  };

  const submit = async () => {
    if (!built?.payload) return;
    try {
      setResult(await apply.mutateAsync(built.payload));
    } catch {
      // surfaced via apply.isError below
    }
  };

  let body: React.ReactNode;

  if (templates.isLoading) {
    body = <div className="flex justify-center py-10"><Spinner /></div>;
  } else if (templates.isError || !data) {
    body = <Alert variant="error">Couldn&apos;t load templates. {errorMessage(templates.error)}</Alert>;
  } else if (result) {
    body = (
      <div className="space-y-4">
        <Alert variant="success">
          Created {result.created.length} {result.created.length === 1 ? 'program' : 'programs'}.
          {' '}They&apos;re inactive — check the prices, then switch on the ones you want.
        </Alert>
        {result.skipped.length > 0 && (
          <Alert variant="info">
            Skipped {result.skipped.map((s) => s.name).join(', ')} because you already have a program with that name.
          </Alert>
        )}
        {result.classBookingOff && (
          <Alert variant="info">
            Class pack sizes weren&apos;t applied because Class Booking isn&apos;t enabled for your account.
          </Alert>
        )}
        <div className="flex justify-end">
          <Button onClick={onClose}>View programs</Button>
        </div>
      </div>
    );
  } else if (!template) {
    body = (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">What kind of business do you run?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.templates.map((t) => (
            <button
              key={t.industry}
              type="button"
              onClick={() => setChosen(t.industry)}
              className="text-left rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="space-y-5">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Pick the programs you want. Prices are typical for {template.label.toLowerCase()} businesses — change anything you like.
          Programs are created <strong>inactive</strong>, so nothing is billable until you review and switch them on.
        </p>

        {groupByKind(template).map((group) => (
          <div key={group.kind} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{group.label}</h3>
            {group.programs.map((program) => {
              const row = selection[program.key];
              const error = built?.errors[program.key];
              return (
                <div
                  key={program.key}
                  className={`rounded-lg border px-3 py-3 ${row.selected ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-900/10' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      aria-label={`Include ${program.name}`}
                      checked={row.selected}
                      onChange={(e) => update(program.key, { selected: e.target.checked })}
                      className="mt-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-2">
                      <div>
                        <input
                          type="text"
                          aria-label={`Name for ${program.name}`}
                          value={row.name}
                          disabled={!row.selected}
                          onChange={(e) => update(program.key, { name: e.target.value })}
                          className={`${fieldClass} disabled:opacity-60`}
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{describe(program)}</p>
                      </div>
                      <div>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3 flex items-center text-sm text-gray-400">$</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            aria-label={`Price for ${program.name}`}
                            value={row.price}
                            disabled={!row.selected}
                            onChange={(e) => update(program.key, { price: e.target.value })}
                            className={`${fieldClass} pl-7 disabled:opacity-60`}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Typical ${program.priceRange[0]}–${program.priceRange[1]}
                        </p>
                      </div>
                    </div>
                  </div>
                  {error && row.selected && <p className="mt-2 ml-7 text-xs text-red-600 dark:text-red-400">{error}</p>}
                </div>
              );
            })}
          </div>
        ))}

        {apply.isError && <Alert variant="error">{errorMessage(apply.error)}</Alert>}

        <div className="flex items-center justify-between gap-2 pt-2">
          {data.templates.length > 1 ? (
            <Button variant="ghost" onClick={() => setChosen(null)}>Change business type</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} loading={apply.isPending} disabled={!built?.payload}>
              Create {built?.selectedCount ?? 0} {built?.selectedCount === 1 ? 'program' : 'programs'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {template && !result ? `${template.label} starter programs` : result ? 'Programs created' : 'Start from a template'}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="px-6 py-5 overflow-y-auto">{body}</div>
    </>
  );
}

export function TemplatePickerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Start from a template"
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-gray-800 shadow-xl"
      >
        <PickerBody onClose={onClose} />
      </div>
    </div>
  );
}
