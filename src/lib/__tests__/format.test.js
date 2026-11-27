import { describe, expect, it } from 'vitest';
import { addFrequency, titleCaseName } from '../format.js';

describe('addFrequency', () => {
  const today = '2026-01-01';
  it('adds a month', () => expect(addFrequency('2026-01-15', 'Monthly', today)).toBe('2026-02-15'));
  it('clamps the end of the month instead of skipping February', () => {
    expect(addFrequency('2026-01-31', 'Monthly', today)).toBe('2026-02-28');
    expect(addFrequency('2024-01-31', 'Monthly', '2024-01-01')).toBe('2024-02-29');
  });
  it('keeps the original day after a short month', () => expect(addFrequency('2026-01-31', 'Monthly', '2026-02-28')).toBe('2026-03-31'));
  it('adds a week across a month boundary', () => expect(addFrequency('2026-01-28', 'Weekly', today)).toBe('2026-02-04'));
  it('adds a quarter', () => expect(addFrequency('2025-11-30', 'Quarterly', '2025-11-01')).toBe('2026-02-28'));
  it('adds a year (leap day)', () => expect(addFrequency('2024-02-29', 'Yearly', '2024-03-01')).toBe('2025-02-28'));
  it('moves past today when the date is old', () => expect(addFrequency('2025-06-10', 'Monthly', '2026-01-20')).toBe('2026-02-10'));
});

describe('titleCaseName', () => {
  it('title-cases and squeezes spaces', () => expect(titleCaseName('  mOHAMED   ali ')).toBe('Mohamed Ali'));
});
