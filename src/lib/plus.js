// Pocket Plus: which features it unlocks and what state a user's plan is in.
export const PLUS_FEATURES = ['bank_sms', 'chat', 'vehicle_management'];
export const PLUS_DEFAULTS = { daily_price: 0, monthly_price: 0, yearly_price: 0, trial_days: 14, instapay: '', instapay_link: '', wallet: '', currency: 'EGP' };

const t = v => (v ? new Date(v).getTime() : null);
export const daysLeft = (end, now = Date.now()) => (end ? Math.max(0, Math.ceil((t(end) - now) / 864e5)) : null);

// A row gives Plus right now?
export function rowIsLive(r, now = Date.now()) {
  if (r.status === 'trial') return t(r.trial_ends_at) > now;
  if (r.status === 'active') return r.current_period_end == null || t(r.current_period_end) > now;
  return false;
}

// subs: the user's rows, any order.
export function plusState(subs = [], now = Date.now()) {
  const rows = [...subs].sort((a, b) => t(b.created_at) - t(a.created_at));
  const live = rows.filter(r => rowIsLive(r, now)).sort((a, b) => (b.status === 'active') - (a.status === 'active') || (t(b.current_period_end || b.trial_ends_at) || Infinity) - (t(a.current_period_end || a.trial_ends_at) || Infinity));
  const current = live[0] || null;
  const pending = rows.find(r => r.status === 'pending') || null;
  const rejected = rows.find(r => r.status === 'rejected' && (!pending || t(r.updated_at) > t(pending.created_at))) || null;
  const last = rows[0] || null;
  const endsAt = current ? (current.status === 'trial' ? current.trial_ends_at : current.current_period_end) : null;
  return {
    active: Boolean(current),
    kind: current ? (current.status === 'trial' ? 'trial' : current.period === 'gift' ? 'gift' : 'paid') : null,
    current, pending, rejected, last, endsAt,
    daysLeft: daysLeft(endsAt, now),
    trialUsed: rows.length > 0,
    ended: !current && rows.some(r => r.status === 'trial' || r.status === 'active'),
  };
}

// Owner confirms a payment: the new end continues from any time still left.
export function nextPeriodEnd(period, fromRows = [], now = Date.now()) {
  const liveEnds = fromRows.filter(r => rowIsLive(r, now)).map(r => t(r.status === 'trial' ? r.trial_ends_at : r.current_period_end)).filter(Boolean);
  const start = new Date(Math.max(now, ...liveEnds.filter(e => e > 0)));
  const d = new Date(start);
  if (period === 'yearly') d.setFullYear(d.getFullYear() + 1); else if (period === 'daily') d.setDate(d.getDate() + 1); else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
