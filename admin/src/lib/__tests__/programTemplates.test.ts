import { describe, it, expect } from 'vitest';
import { buildApplyPayload, groupByKind, initialSelection } from '../programTemplates';
import type { IndustryTemplate } from '../../api/programs';

const TEMPLATE: IndustryTemplate = {
  industry: 'dance',
  label: 'Dance',
  programs: [
    { key: 'weekly', name: 'Weekly class', description: '', billingFrequency: 'monthly', suggestedPrice: 75, priceRange: [60, 100], kind: 'recurring', defaultSelected: true },
    { key: 'unlimited', name: 'Unlimited', description: '', billingFrequency: 'monthly', suggestedPrice: 189, priceRange: [150, 220], kind: 'recurring', defaultSelected: false },
    { key: 'pack', name: '10-class pass', description: '', billingFrequency: 'one_time', suggestedPrice: 200, priceRange: [150, 300], maxClasses: 10, kind: 'pack', defaultSelected: false },
    { key: 'reg', name: 'Registration fee', description: '', billingFrequency: 'one_time', suggestedPrice: 40, priceRange: [25, 60], kind: 'fee', defaultSelected: true },
  ],
};

describe('initialSelection', () => {
  it('pre-selects default programs and prefills name and suggested price', () => {
    const state = initialSelection(TEMPLATE);

    expect(state.weekly).toEqual({ selected: true, name: 'Weekly class', price: '75' });
    expect(state.unlimited.selected).toBe(false);
    expect(state.reg).toEqual({ selected: true, name: 'Registration fee', price: '40' });
  });
});

describe('groupByKind', () => {
  it('groups in a fixed order and omits empty groups', () => {
    const groups = groupByKind(TEMPLATE);
    expect(groups.map((g) => g.kind)).toEqual(['recurring', 'pack', 'fee']);
    expect(groups[0].programs.map((p) => p.key)).toEqual(['weekly', 'unlimited']);

    const noPacks = groupByKind({ ...TEMPLATE, programs: TEMPLATE.programs.filter((p) => p.kind !== 'pack') });
    expect(noPacks.map((g) => g.kind)).toEqual(['recurring', 'fee']);
  });
});

describe('buildApplyPayload', () => {
  it('builds a payload from the pre-selected rows without changes', () => {
    const { payload, errors, selectedCount } = buildApplyPayload(TEMPLATE, initialSelection(TEMPLATE));

    expect(errors).toEqual({});
    expect(selectedCount).toBe(2);
    expect(payload).toEqual({
      industry: 'dance',
      programs: [
        { key: 'weekly', price: 75 },
        { key: 'reg', price: 40 },
      ],
    });
  });

  it('only sends the name when it was changed, and trims it', () => {
    const state = initialSelection(TEMPLATE);
    state.weekly.name = '  Ballet class  ';
    state.weekly.price = '80.5';

    const { payload } = buildApplyPayload(TEMPLATE, state);

    expect(payload?.programs[0]).toEqual({ key: 'weekly', price: 80.5, name: 'Ballet class' });
    expect(payload?.programs[1]).toEqual({ key: 'reg', price: 40 });
  });

  it('ignores unselected rows, even invalid ones', () => {
    const state = initialSelection(TEMPLATE);
    state.unlimited.price = 'abc';

    const { payload, errors } = buildApplyPayload(TEMPLATE, state);

    expect(errors).toEqual({});
    expect(payload?.programs.map((p) => p.key)).toEqual(['weekly', 'reg']);
  });

  it.each([
    ['empty price', ''],
    ['zero price', '0'],
    ['negative price', '-5'],
    ['non-numeric price', 'abc'],
  ])('reports an error and no payload for %s', (_label, price) => {
    const state = initialSelection(TEMPLATE);
    state.weekly.price = price;

    const { payload, errors } = buildApplyPayload(TEMPLATE, state);

    expect(payload).toBeNull();
    expect(errors.weekly).toBe('Enter a price above $0');
  });

  it('reports blank and over-long names', () => {
    const state = initialSelection(TEMPLATE);
    state.weekly.name = '   ';
    state.reg.name = 'x'.repeat(101);

    const { payload, errors } = buildApplyPayload(TEMPLATE, state);

    expect(payload).toBeNull();
    expect(errors.weekly).toBe('Enter a name');
    expect(errors.reg).toBe('Name is too long');
  });

  it('returns no payload when nothing is selected', () => {
    const state = initialSelection(TEMPLATE);
    state.weekly.selected = false;
    state.reg.selected = false;

    const { payload, selectedCount } = buildApplyPayload(TEMPLATE, state);

    expect(payload).toBeNull();
    expect(selectedCount).toBe(0);
  });
});
