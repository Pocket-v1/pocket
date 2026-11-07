import { isGoalsAccount } from './features.js';
import { localISODate } from './format.js';

export const CARD_TYPE = 'Credit card';
export const PROVIDER_TYPE = 'Installment app';
export const PROVIDER_PRESETS = ['Valu', 'Aman', 'Souhoola', 'Contact', 'Sympl', 'Halan', 'Forsa', 'Shahry', 'Premium Card', 'Mogo', 'Klivvr', 'Seven', 'TRU', 'Mylo'];

export const isCard = a => Boolean(a && a.type === CARD_TYPE);
export const isProvider = a => Boolean(a && a.type === PROVIDER_TYPE);
// Cards and installment apps hold what you owe, not money you own.
export const isLiability = a => isCard(a) || isProvider(a);
// Real money accounts: bank, cash, wallets, savings. Used for "pay from" and transfer sources.
export const isMoneyAccount = a => Boolean(a) && !isGoalsAccount(a) && !isLiability(a);
// Accounts an expense can be charged to: money accounts, credit cards and installment apps.
export const isChargeable = a => Boolean(a) && !isGoalsAccount(a);

const DAY = 864e5;
const num = v => Number(v || 0);
// A plan uses limit for the money financed (the price), not for interest/fees. Shrinks as it is repaid.
export const planLimitUse = d => { const total = num(d.total_repayment) || num(d.original_amount); return total > 0 ? num(d.original_amount) * Math.min(1, num(d.remaining_amount) / total) : num(d.remaining_amount); };
// Halan lowers the used limit by the PRINCIPAL part of each paid installment (reducing balance),
// not by an equal share of the price. We solve the monthly rate from price, installment and term,
// then return the principal still outstanding after the installments already paid.
export const isReducingProvider = a => /halan/i.test(String(a?.name || ''));
export function reducingUse(d) {
  const P = num(d.original_amount), pay = num(d.monthly_payment), n = Math.round(num(d.term_months));
  if (num(d.remaining_amount) <= 0) return 0;
  if (!(P > 0 && pay > 0 && n > 0) || pay * n <= P) return null;
  let lo = 1e-6, hi = 1;
  for (let i = 0; i < 80; i++) { const r = (lo + hi) / 2; const f = P * r / (1 - Math.pow(1 + r, -n)); if (f > pay) hi = r; else lo = r; }
  const r = (lo + hi) / 2;
  const k = Math.min(n, Math.max(0, Math.round(num(d.paid_installments))));
  let bal = P;
  for (let i = 0; i < k; i++) bal = Math.max(0, bal * (1 + r) - pay);
  return Math.min(P, bal);
}
export const planUse = (d, provider) => { if (isReducingProvider(provider)) { const v = reducingUse(d); if (v != null) return v; } return planLimitUse(d); };
const iso = ms => new Date(ms).toISOString().slice(0, 10);
const utc = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };

export function accountFlows(account, transactions = []) {
  const id = String(account.id);
  let inflow = 0, outflow = 0;
  for (const t of transactions) {
    const from = String(t.account_id) === id, to = String(t.to_account_id) === id;
    if ((t.type === 'Income' && from) || (t.type === 'Transfer' && to)) inflow += num(t.amount);
    if (((t.type === 'Expense' || t.type === 'Transfer') && from)) outflow += num(t.amount);
  }
  return { inflow, outflow, balance: num(account.opening_balance) + inflow - outflow };
}

// Which statement does a purchase land on, and when is it due?
// Bought on or before the statement day -> this month's statement. After it -> next month's.
export function cardCycle(dateISO, card) {
  const grace = card.grace_days == null ? 25 : num(card.grace_days);
  const d = new Date(utc(dateISO));
  const day = num(card.statement_day);
  if (!day) { const dueMs = d.getTime() + (grace || 30) * DAY; return { statement: null, due: iso(dueMs), days: Math.round((dueMs - d.getTime()) / DAY) }; }
  let month = d.getUTCMonth();
  if (d.getUTCDate() > day) month += 1;
  const stMs = Date.UTC(d.getUTCFullYear(), month, day);
  const dueMs = stMs + grace * DAY;
  return { statement: iso(stMs), due: iso(dueMs), days: Math.round((dueMs - d.getTime()) / DAY) };
}

export const daysUntil = (dateISO, today = localISODate()) => Math.round((utc(dateISO) - utc(today)) / DAY);

export function dueTone(days) { return days < 0 ? 'bad' : days <= 7 ? 'warn' : 'ok'; }
export function dueLabel(dateISO, today = localISODate()) {
  const n = daysUntil(dateISO, today);
  return n < 0 ? `Overdue by ${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'}` : n === 0 ? 'Due today' : n === 1 ? 'Due tomorrow' : `In ${n} days`;
}

/**
 * Everything the credit card screens need, derived from transactions (no extra stored state).
 * Purchases = expenses charged to the card. Payments = transfers into the card, plus refunds (income).
 * Payments are applied to the oldest statement first, so you always know what is due next.
 */
export function cardSummary(card, transactions = [], today = localISODate(), debts = []) {
  const id = String(card.id);
  const limit = num(card.credit_limit);
  const { balance } = accountFlows(card, transactions);
  // A purchase turned into installments leaves the statement: the plan carries what is still owed.
  const planIds = new Set(debts.map(d => String(d.id)));
  const isConverted = t => Boolean(t.debt_id && planIds.has(String(t.debt_id)));
  const converted = transactions.filter(t => t.type === 'Expense' && String(t.account_id) === id && isConverted(t));
  const convertedTotal = converted.reduce((s, t) => s + num(t.amount), 0);
  const plans = debts.filter(d => String(d.provider_account_id) === id);
  const activePlans = plans.filter(d => num(d.remaining_amount) > 0);
  const planOwed = activePlans.reduce((s, d) => s + num(d.remaining_amount), 0);
  const planLimit = activePlans.reduce((s, d) => s + planLimitUse(d), 0);
  const owed = Math.max(0, -balance - convertedTotal) + planLimit;

  const charges = [];
  if (num(card.opening_balance) < 0) charges.push({ id: 'opening', date: card.opening_balance_date || (card.created_at ? String(card.created_at).slice(0, 10) : today), description: 'Balance before Pocket', amount: -num(card.opening_balance), opening: true });
  for (const t of transactions) {
    if (String(t.account_id) === id && (t.type === 'Expense' || t.type === 'Transfer') && !isConverted(t)) charges.push({ id: t.id, date: t.transaction_date, description: t.description || t.category || 'Purchase', amount: num(t.amount), tx: t });
  }
  const payments = transactions
    .filter(t => (t.type === 'Transfer' && String(t.to_account_id) === id) || (t.type === 'Income' && String(t.account_id) === id))
    .map(t => ({ id: t.id, date: t.transaction_date, amount: num(t.amount), from: t.type === 'Income' ? 'Refund' : t.account_id, tx: t }))
    .sort((a, b) => b.date.localeCompare(a.date));
  let credit = payments.reduce((s, p) => s + p.amount, 0);

  const groupsMap = new Map();
  for (const c of charges.sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)))) {
    const cyc = cardCycle(c.date, card);
    if (!groupsMap.has(cyc.due)) groupsMap.set(cyc.due, { due: cyc.due, statement: cyc.statement, items: [], total: 0, remaining: 0 });
    const g = groupsMap.get(cyc.due);
    const take = Math.min(c.amount, credit); credit -= take;
    g.items.push({ ...c, remaining: c.amount - take }); g.total += c.amount; g.remaining += c.amount - take;
  }
  const all = [...groupsMap.values()].sort((a, b) => a.due.localeCompare(b.due)).map(g => ({ ...g, days: daysUntil(g.due, today) }));
  const groups = all.filter(g => g.remaining > 0.004);
  const next = groups[0] || null;
  return { plans, activePlans, planOwed, limit, balance, owed, available: Math.max(0, limit - owed), usedPct: limit > 0 ? Math.min(100, owed / limit * 100) : 0, groups, next, settled: all.filter(g => g.remaining <= 0.004), payments, needsSetup: !card.statement_day || !limit };
}

// Pay-now choices: each option clears everything due up to and including that due date.
export function cardPayOptions(summary) {
  let running = 0;
  return summary.groups.map((g, i) => { running += g.remaining; return { key: i, due: g.due, amount: Math.round(running * 100) / 100, last: i === summary.groups.length - 1 }; });
}

/** Installment app: the plans are debts linked by provider_account_id. Limit used = what is still owed on them. */
export function providerSummary(provider, debts = [], today = localISODate(), transactions = []) {
  const plans = debts.filter(d => String(d.provider_account_id) === String(provider.id));
  const active = plans.filter(d => num(d.remaining_amount) > 0);
  const limit = num(provider.credit_limit);
  const planIds = new Set(debts.map(d => String(d.id)));
  const id = String(provider.id);
  const loosePurchases = transactions.filter(t => t.type === 'Expense' && String(t.account_id) === id && !(t.debt_id && planIds.has(String(t.debt_id)))).sort((a, b) => String(b.transaction_date).localeCompare(String(a.transaction_date)));
  const paidLoose = transactions.filter(t => t.type === 'Transfer' && String(t.to_account_id) === id).reduce((s, t) => s + num(t.amount), 0);
  const looseOwed = Math.max(0, loosePurchases.reduce((s, t) => s + num(t.amount), 0) - paidLoose);
  const used = active.reduce((s, d) => s + planUse(d, provider), 0) + looseOwed;
  const byDue = new Map();
  for (const d of active) {
    const due = d.due_date || '';
    if (!byDue.has(due)) byDue.set(due, { due, plans: [], amount: 0 });
    const g = byDue.get(due); g.plans.push(d); g.amount += Math.min(num(d.monthly_payment), num(d.remaining_amount));
  }
  const groups = [...byDue.values()].filter(g => g.due).sort((a, b) => a.due.localeCompare(b.due)).map(g => ({ ...g, days: daysUntil(g.due, today) }));
  return { looseOwed, loosePurchases, plans, active, done: plans.filter(d => num(d.remaining_amount) <= 0), limit, used, available: Math.max(0, limit - used), usedPct: limit > 0 ? Math.min(100, used / limit * 100) : 0, groups, next: groups[0] || null, monthly: active.reduce((s, d) => s + Math.min(num(d.monthly_payment), num(d.remaining_amount)), 0) };
}

export const money = (currency = 'EGP', digits = 0) => n => new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: digits }).format(Number(n) || 0);
export const providerOwner = (debt, accounts = []) => accounts.find(a => String(a.id) === String(debt.provider_account_id));

/**
 * Transactions as REPORTS should see them (totals, budgets, charts).
 * - A purchase on a credit card or installment app is only recorded: it is not an expense yet.
 * - Paying the card / the app (a transfer into it) IS the expense, so it is counted then.
 * - Refunds into a card are not income.
 */
export function reportView(transactions = [], accounts = []) {
  const byId = new Map(accounts.map(a => [String(a.id), a]));
  const out = [];
  for (const t of transactions) {
    const from = byId.get(String(t.account_id)), to = byId.get(String(t.to_account_id));
    if (t.type === 'Expense' && isLiability(from)) continue;
    if (t.type === 'Income' && isLiability(from)) continue;
    if (t.type === 'Transfer' && isLiability(to) && !isLiability(from) && !isGoalsAccount(from)) {
      out.push({ ...t, type: 'Expense', category: 'Savings & Debt', subcategory: isCard(to) ? 'Credit card payment' : 'Installment app payment', need_want: 'Need', counted_from_transfer: true });
      continue;
    }
    out.push(t);
  }
  return out;
}

// How much limit is left on a card or an installment app (counts plans and recorded purchases once).
export function limitLeft(account, debts = [], transactions = []) {
  return isCard(account) ? cardSummary(account, transactions, undefined, debts).available : providerSummary(account, debts, undefined, transactions).available;
}
