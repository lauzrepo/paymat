import { INDUSTRIES, isIndustry, parseIndustry } from '../../src/config/industries';
import { AppError } from '../../src/middleware/errorHandler';

describe('industries', () => {
  it('recognises every listed industry and nothing else', () => {
    INDUSTRIES.forEach((i) => expect(isIndustry(i)).toBe(true));
    expect(isIndustry('plumbing')).toBe(false);
    expect(isIndustry(undefined)).toBe(false);
    expect(isIndustry(42)).toBe(false);
  });

  describe('parseIndustry', () => {
    it('returns undefined when omitted', () => {
      expect(parseIndustry(undefined)).toBeUndefined();
    });

    it('returns null when explicitly cleared', () => {
      expect(parseIndustry(null)).toBeNull();
      expect(parseIndustry('')).toBeNull();
    });

    it('returns a valid industry unchanged', () => {
      expect(parseIndustry('martial_arts')).toBe('martial_arts');
    });

    it('throws a 400 AppError for an unknown value', () => {
      expect(() => parseIndustry('plumbing')).toThrow(AppError);
      try {
        parseIndustry('plumbing');
      } catch (err) {
        expect((err as AppError).statusCode).toBe(400);
      }
    });
  });
});
