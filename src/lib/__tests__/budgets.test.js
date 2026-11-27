import { describe, expect, it } from 'vitest';
import { budgetMonthView, carryInto, prevMonth } from '../budgets.js';

const tx = (date, amount, category = 'Food') => ({ type: 'Expense', category, transaction_date: date, amount });

describe('prevMonth', () => {
  it('handles January', () => expect(prevMonth('2026-01')).toBe('2025-12'));
  it('handles other months', () => expect(prevMonth('2026-03')).toBe('2026-02'));
});

describe('carryInto', () => {
  it('is zero when last month had no rollover', () => {
    expect(carryInto([{ category: 'Food', month: '2026-01-01', amount: 1000, rollover: false }], [tx('2026-01-05', 200)], 'Food', '2026-02')).toBe(0);
  });
  it('carries what was left', () => {
    expect(carryInto([{ category: 'Food', month: '2026-01-01', amount: 1000, rollover: true }], [tx('2026-01-05', 200)], 'Food', '2026-02')).toBe(800);
  });
  it('carries overspending as a negative amount', () => {
    expect(carryInto([{ category: 'Food', month: '2026-01-01', amount: 1000, rollover: true }], [tx('2026-01-05', 1300)], 'Food', '2026-02')).toBe(-300);
  });
  it('chains through consecutive rollover months', () => {
    const budgets = [
      { category: 'Food', month: '2025-12-01', amount: 500, rollover: true },
      { category: 'Food', month: '2026-01-01', amount: 1000, rollover: true },
    ];
    // Dec leaves 500, Jan has 1000 + 500 and spends 900 -> 600 into Feb
    expect(carryInto(budgets, [tx('2026-01-09', 900)], 'Food', '2026-02')).toBe(600);
  });
});

describe('budgetMonthView', () => {
  it('adds carry to the limit and compares with last month', () => {
    const budgets = [
      { id: 'a', category: 'Food', month: '2026-01-01', amount: 1000, rollover: true },
      { id: 'b', category: 'Food', month: '2026-02-01', amount: 1000, rollover: false },
    ];
    const t = [tx('2026-01-03', 400), tx('2026-02-03', 800), tx('2026-02-04', 50, 'Travel')];
    const [food, travel] = budgetMonthView(budgets, t, '2026-02', ['Food', 'Travel']);
    expect(food).toMatchObject({ id: 'b', amount: 1000, carry: 600, available: 1600, spent: 800, prevSpent: 400, used: 50, change: 100 });
    expect(travel).toMatchObject({ id: null, amount: 0, carry: 0, spent: 50, change: null });
  });
});
