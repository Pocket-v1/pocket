// Pure helpers for the Bank SMS page: confidence, suggestions, groups, transfers, stats, alerts.
const key = v => String(v || '').trim().toLowerCase();
export const merchantKey = x => key(x._desc || x.merchant);
const median = a => { const s = [...a].sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : 0; };

// "Sure" or "Check this" with the reasons, from what Pocket could read and what it has seen before.
export function confidence(x, hist) {
  const amt = Number(x._amount); const why = [];
  if (!(amt > 0)) why.push('Amount not found');
  if (!x.txn_type) why.push('Could not tell money in or out');
  if (!merchantKey(x)) why.push('No merchant found');
  const seen = new Set(hist.filter(h => h.status === 'approved').map(h => key(h.merchant)).filter(Boolean));
  const past = hist.filter(h => h.status === 'approved' && Number(h.amount) > 0).map(h => Number(h.amount));
  const high = amt > 0 && ((past.length >= 5 && amt > Math.max(1000, median(past) * 5)) || amt >= 10000);
  if (high) why.push('Amount looks high');
  if (amt >= 1000 && merchantKey(x) && !seen.has(merchantKey(x))) why.push('New merchant');
  return { level: why.length ? 'check' : 'sure', why };
}

// After 3 approvals of the same merchant + category + account, offer an auto-approve rule.
export function suggestAuto(x, hist, configs) {
  const m = merchantKey(x); if (!m || !x._acc || x._type !== 'Expense') return null;
  const cfg = configs.find(c => String(c.account_id) === String(x._acc));
  if ((cfg?.auto_rules || []).some(r => key(r.merchant) && m.includes(key(r.merchant)))) return null;
  const same = hist.filter(h => h.status === 'approved' && key(h.merchant) === m && String(h.account_id) === String(x._acc) && key(h.category) === key(x._cat) && Number(h.amount) > 0);
  if (same.length < 3) return null;
  const max = Math.ceil(Math.max(...same.map(h => Number(h.amount))) * 1.3 / 10) * 10;
  return { merchant: x._desc || x.merchant, max, n: same.length };
}

export function groupsByMerchant(ready) {
  const g = new Map();
  ready.forEach(x => { const k = merchantKey(x); if (!k) return; const e = g.get(k) || { key: k, label: x._desc || x.merchant, ids: [] }; e.ids.push(x.id); g.set(k, e); });
  return [...g.values()].sort((a, b) => b.ids.length - a.ids.length).slice(0, 4);
}

// Opposite SMS with the same amount within 30 minutes: likely one transfer seen from both banks.
export function detectTransfers(items) {
  const out = {};
  for (const a of items) for (const b of items) {
    if (a.id >= b.id || !(Number(a._amount) > 0)) continue;
    if (a._type === b._type || Number(a._amount) !== Number(b._amount)) continue;
    if (Math.abs(new Date(a.received_at) - new Date(b.received_at)) > 30 * 60000) continue;
    out[a.id] = b; out[b.id] = a;
  }
  return out;
}

export function perDay(rows, days = 14) {
  const base = new Date(); base.setHours(0, 0, 0, 0);
  const res = Array.from({ length: days }, (_, i) => ({ d: new Date(base.getTime() - (days - 1 - i) * 864e5), n: 0 }));
  rows.forEach(r => { const t = new Date(r.received_at); t.setHours(0, 0, 0, 0); const o = res.find(e => e.d.getTime() === t.getTime()); if (o) o.n++; });
  return res;
}

export function topMerchants(hist, n = 5) {
  const g = new Map();
  hist.filter(h => h.status === 'approved' && h.txn_type !== 'Income' && h.merchant && Number(h.amount) > 0).forEach(h => { const k = key(h.merchant); const e = g.get(k) || { name: h.merchant, total: 0, count: 0 }; e.total += Number(h.amount); e.count++; g.set(k, e); });
  return [...g.values()].sort((a, b) => b.total - a.total).slice(0, n);
}

export function silentAlerts(configs, rows, accounts, days = 3) {
  const out = [];
  configs.filter(c => c.enabled !== false && (c.senders || []).length).forEach(c => {
    const mine = rows.filter(r => String(r.account_id) === String(c.account_id)).map(r => new Date(r.received_at).getTime());
    if (mine.length < 3) return;
    const ageDays = (Date.now() - Math.max(...mine)) / 864e5;
    if (ageDays > days) out.push({ account: accounts.find(a => String(a.id) === String(c.account_id))?.name || 'Account', sender: c.senders[0], days: Math.floor(ageDays) });
  });
  return out;
}

export function downloadJson(name, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
