import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, cn } from '../utils';

describe('formatCurrency', () => {
  it('formats USD amounts correctly', () => {
    expect(formatCurrency(100)).toBe('$100.00');
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats other currencies when specified', () => {
    const result = formatCurrency(100, 'EUR');
    expect(result).toContain('100');
  });
});

describe('formatDate', () => {
  it('formats an ISO date string to a readable format', () => {
    const result = formatDate('2026-01-15T00:00:00Z');
    expect(result).toMatch(/Jan/i);
    expect(result).toContain('2026');
  });

  it('returns a non-empty string for a valid date', () => {
    expect(formatDate('2025-06-01')).toBeTruthy();
  });
});

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', false, null, undefined, 'bar')).toBe('foo bar');
  });

  it('returns empty string for all falsy values', () => {
    expect(cn(false, null, undefined)).toBe('');
  });

  it('handles a single class', () => {
    expect(cn('solo')).toBe('solo');
  });
});
