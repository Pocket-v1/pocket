import { describe, expect, it } from 'vitest';
import { accountFlows, cardCycle, cardPayOptions, cardSummary, planLimitUse, providerSummary } from '../credit.js';

const card = { id: 'c1', type: 'Credit card', credit_limit: 10000, statement_day: 25, grace_days: 25, opening_balance: 0 };

describe('accountFlows', () => {
  it('adds income and incoming transfers, subtracts expenses and outgoing transfers', () => {
    const tx = [
      { type: 'Income', account_id: 'a', amount: 1000 },
      { type: 'Expense', account_id: 'a', amount: 200 },
      { type: 'Transfer', account_id: 'a', to_account_id: 'b', amount: 300 },
      { type: 'Transfer', account_id: 'b', to_account_id: 'a', amount: 50 },
      { type: 'Expense', account_id: 'b', amount: 999 },
    ];
    expect(accountFlows({ id: 'a', opening_balance: 100 }, tx)).toEqual({ inflow: 1050, outflow: 500, balance: 650 });
  });
});

describe('cardCycle', () => {
  it('a purchase on or before the statement day lands on this month', () => {
    expect(cardCycle('2026-03-25', card)).toMatchObject({ statement: '2026-03-25', due: '2026-04-19' });
  });
  it('a purchase after the statement day lands on next month', () => {
    expect(cardCycle('2026-03-26', card)).toMatchObject({ statement: '2026-04-25', due: '2026-05-20' });
  });
  it('rolls over the year in December', () => {
    expect(cardCycle('2026-12-30', card).statement).toBe('2027-01-25');
  });
});

describe('planLimitUse', () => {
  it('counts financed principal in proportion to what is left', () => {
    expect(planLimitUse({ original_amount: 1000, total_repayment: 1200, remaining_amount: 600 })).toBe(500);
  });
  it('never counts more than the principal', () => {
    expect(planLimitUse({ original_amount: 1000, total_repayment: 1200, remaining_amount: 5000 })).toBe(1000);
  });
});

describe('cardSummary', () => {
  it('applies payments to the oldest statement first', () => {
    const tx = [
      { id: 't1', type: 'Expense', account_id: 'c1', amount: 1000, transaction_date: '2026-03-10' },
      { id: 't2', type: 'Expense', account_id: 'c1', amount: 500, transaction_date: '2026-04-10' },
      { id: 'p1', type: 'Transfer', account_id: 'bank', to_account_id: 'c1', amount: 1200, transaction_date: '2026-04-15' },
    ];
    const s = cardSummary(card, tx, '2026-04-16');
    expect(s.owed).toBe(300);
    expect(s.available).toBe(9700);
    expect(s.groups).toHaveLength(1);
    expect(s.next).toMatchObject({ due: '2026-05-20', remaining: 300 });
    expect(cardPayOptions(s)).toEqual([{ key: 0, due: '2026-05-20', amount: 300, last: true }]);
  });
  it('a purchase converted to installments leaves the statement and counts through the plan', () => {
    const tx = [{ id: 't1', type: 'Expense', account_id: 'c1', amount: 1200, transaction_date: '2026-03-10', debt_id: 'd1' }];
    const debts = [{ id: 'd1', provider_account_id: 'c1', original_amount: 1200, total_repayment: 1200, remaining_amount: 600 }];
    const s = cardSummary(card, tx, '2026-04-01', debts);
    expect(s.groups).toHaveLength(0);
    expect(s.owed).toBe(600);
  });
});

describe('providerSummary', () => {
  it('limit used counts plans and unpaid loose purchases once', () => {
    const provider = { id: 'v1', type: 'Installment app', credit_limit: 20000 };
    const debts = [{ id: 'd1', provider_account_id: 'v1', original_amount: 6000, total_repayment: 6000, remaining_amount: 3000, monthly_payment: 1000, due_date: '2026-05-01' }];
    const tx = [{ id: 'x', type: 'Expense', account_id: 'v1', amount: 2000, transaction_date: '2026-04-01' }];
    const s = providerSummary(provider, debts, '2026-04-20', tx);
    expect(s.used).toBe(5000);
    expect(s.available).toBe(15000);
    expect(s.monthly).toBe(1000);
    expect(s.next).toMatchObject({ due: '2026-05-01', days: 11 });
  });
});
describe('multi-currency', async () => {
  const { reportView, fxRate, toBase } = await import('../credit.js');
  const { setDisplayCurrency } = await import('../format.js');
  setDisplayCurrency('EGP');
  const egp = { id: 'e', type: 'Bank account', currency: 'EGP' };
  const usd = { id: 'u', type: 'Bank account', currency: 'USD', fx_rate: 50 };
  it('main-currency accounts have rate 1, others use fx_rate', () => {
    expect(fxRate(egp)).toBe(1); expect(fxRate({ id: 'x' })).toBe(1); expect(fxRate(usd)).toBe(50); expect(toBase(10, usd)).toBe(500);
  });
  it('reports convert foreign-currency spending to the main currency', () => {
    const out = reportView([{ id: 1, type: 'Expense', account_id: 'u', amount: 10 }, { id: 2, type: 'Expense', account_id: 'e', amount: 10 }], [egp, usd]);
    expect(out.map(t => t.amount)).toEqual([500, 10]);
    expect(out[0]).toMatchObject({ original_amount: 10, original_currency: 'USD' });
  });
  it('a transfer between currencies credits to_amount to the destination', () => {
    const tx = [{ type: 'Transfer', account_id: 'e', to_account_id: 'u', amount: 5000, to_amount: 100 }];
    expect(accountFlows(egp, tx).balance).toBe(-5000);
    expect(accountFlows(usd, tx).balance).toBe(100);
  });
});
