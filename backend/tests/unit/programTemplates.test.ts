import { INDUSTRIES } from '../../src/config/industries';
import { PROGRAM_TEMPLATES, getTemplate } from '../../src/config/programTemplates';

describe('program template config', () => {
  it('has exactly one template per industry', () => {
    expect(PROGRAM_TEMPLATES.map((t) => t.industry).sort()).toEqual([...INDUSTRIES].sort());
  });

  describe.each(PROGRAM_TEMPLATES)('$industry', (template) => {
    it('has at least one program and one pre-selected program', () => {
      expect(template.programs.length).toBeGreaterThan(0);
      expect(template.programs.some((p) => p.defaultSelected)).toBe(true);
    });

    it('has unique program keys and names', () => {
      const keys = template.programs.map((p) => p.key);
      const names = template.programs.map((p) => p.name.toLowerCase());
      expect(new Set(keys).size).toBe(keys.length);
      expect(new Set(names).size).toBe(names.length);
    });

    it.each(template.programs)('$key is well formed', (program) => {
      expect(program.name.length).toBeGreaterThan(0);
      expect(program.name.length).toBeLessThanOrEqual(100);
      expect(program.suggestedPrice).toBeGreaterThan(0);

      const [min, max] = program.priceRange;
      expect(min).toBeLessThanOrEqual(max);
      expect(program.suggestedPrice).toBeGreaterThanOrEqual(min);
      expect(program.suggestedPrice).toBeLessThanOrEqual(max);

      if (program.maxClasses !== undefined) {
        expect(Number.isInteger(program.maxClasses)).toBe(true);
        expect(program.maxClasses).toBeGreaterThan(0);
      }
      if (program.maxBillingCycles !== undefined) {
        expect(Number.isInteger(program.maxBillingCycles)).toBe(true);
        expect(program.maxBillingCycles).toBeGreaterThan(0);
      }
    });

    it('keeps kind consistent with the program fields', () => {
      for (const program of template.programs) {
        if (program.kind === 'pack') {
          expect(program.maxClasses).toBeDefined();
          expect(program.billingFrequency).toBe('one_time');
        }
        if (program.kind === 'fee') {
          expect(program.billingFrequency).toBe('one_time');
          expect(program.maxClasses).toBeUndefined();
        }
        if (program.kind === 'recurring') {
          expect(program.billingFrequency).not.toBe('one_time');
        }
      }
    });
  });

  it('getTemplate returns undefined for an unknown industry', () => {
    expect(getTemplate('plumbing')).toBeUndefined();
    expect(getTemplate('dance')?.label).toBe('Dance');
  });
});
