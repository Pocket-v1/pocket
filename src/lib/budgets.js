// Budget maths: rollover of unused money and month-over-month comparison. Pure functions (tested).

export const prevMonth = m => { const [y, mo] = m.split('-').map(Number); const d = new Date(Date.UTC(y, mo - 2, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const ym = s => String(s || '').slice(0, 7);
const n = v => Number(v) || 0;

export function spentIn(transactions, category, month) {
  return transactions.reduce((s, t) => s + (t.type === 'Expense' && t.category === category && ym(t.transaction_date) === month ? n(t.amount) : 0), 0);
}

/**
 * Money carried into `month` for a category: what was left (or overspent) last month, if last month's budget
 * had rollover on. Chains back through consecutive rollover months. Overspending carries as a negative amount.
 */
export function carryInto(budgets, transactions, category, month, depth = 0) {
  if (depth > 36) return 0;
  const prev = prevMonth(month);
  const b = budgets.find(x => x.category === category && ym(x.month) === prev);
  if (!b || !b.rollover) return 0;
  return carryInto(budgets, transactions, category, prev, depth + 1) + n(b.amount) - spentIn(transactions, category, prev);
}

/** One row per category for the month: limit, carry, available, spent, % used, and last month's spending. */
export function budgetMonthView(budgets, transactions, month, categories) {
  const prev = prevMonth(month);
  return categories.map(category => {
    const b = budgets.find(x => x.category === category && ym(x.month) === month);
    const amount = n(b?.amount);
    const carry = b ? carryInto(budgets, transactions, category, month) : 0;
    const available = amount + carry;
    const spent = spentIn(transactions, category, month);
    const prevSpent = spentIn(transactions, category, prev);
    return {
      ...(b || { id: null, month: `${month}-01`, rollover: false }), category, amount, carry, available, spent, prevSpent,
      used: available > 0 ? spent / available * 100 : (spent > 0 ? 100 : 0),
      change: prevSpent > 0 ? (spent - prevSpent) / prevSpent * 100 : null,
    };
  });
}
