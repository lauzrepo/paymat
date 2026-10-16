import type { ApplyTemplateBody, IndustryTemplate } from '../api/programs';

export interface RowState {
  selected: boolean;
  name: string;
  /** Kept as a string so the input can be edited freely. */
  price: string;
}

export type SelectionState = Record<string, RowState>;

export const KIND_LABELS: Record<string, string> = {
  recurring: 'Recurring',
  pack: 'Class packs',
  fee: 'Fees',
};

const KIND_ORDER = ['recurring', 'pack', 'fee'];

export function initialSelection(template: IndustryTemplate): SelectionState {
  return Object.fromEntries(
    template.programs.map((p) => [
      p.key,
      { selected: p.defaultSelected, name: p.name, price: String(p.suggestedPrice) },
    ])
  );
}

export function groupByKind(template: IndustryTemplate) {
  return KIND_ORDER.map((kind) => ({
    kind,
    label: KIND_LABELS[kind],
    programs: template.programs.filter((p) => p.kind === kind),
  })).filter((g) => g.programs.length > 0);
}

export interface BuildResult {
  payload: ApplyTemplateBody | null;
  /** Row errors keyed by program key. */
  errors: Record<string, string>;
  selectedCount: number;
}

/** Validates the selected rows and builds the apply request. Name is only sent when changed. */
export function buildApplyPayload(template: IndustryTemplate, state: SelectionState): BuildResult {
  const errors: Record<string, string> = {};
  const programs: ApplyTemplateBody['programs'] = [];

  for (const program of template.programs) {
    const row = state[program.key];
    if (!row?.selected) continue;

    const name = row.name.trim();
    const price = Number(row.price);
    if (!name) errors[program.key] = 'Enter a name';
    else if (name.length > 100) errors[program.key] = 'Name is too long';
    else if (row.price.trim() === '' || !Number.isFinite(price) || price <= 0) errors[program.key] = 'Enter a price above $0';
    else programs.push({ key: program.key, price, ...(name !== program.name && { name }) });
  }

  const selectedCount = template.programs.filter((p) => state[p.key]?.selected).length;
  const hasErrors = Object.keys(errors).length > 0;

  return {
    payload: hasErrors || programs.length === 0 ? null : { industry: template.industry, programs },
    errors,
    selectedCount,
  };
}
