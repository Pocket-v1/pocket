import { AlertTriangle, CheckCircle2, TriangleAlert } from '../../lib/icons.jsx';
import { useMemo } from 'react';
import { accountFlows } from '../../lib/credit.js';
import { findBalance } from '../../lib/smsParser.js';
import { perDay, silentAlerts, topMerchants } from '../../lib/smsInsights.js';

export function SmsInsights({ items, hist, configs, usable, accounts, transactions, fmt, flagged }) {
  const rows = useMemo(() => [...items, ...hist], [items, hist]);
  const monthStart = useMemo(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }, []);
  const month = rows.filter(r => new Date(r.received_at) >= monthStart);
  const approved = month.filter(r => r.status === 'approved');
  const decided = month.filter(r => r.status !== 'pending');
  const pct = decided.length ? Math.round(approved.length / decided.length * 100) : 0;
  const edited = approved.filter(r => r.edited).length;
  const acc = approved.length ? Math.round((approved.length - edited) / approved.length * 100) : 0;
  const auto = approved.filter(r => r.auto).length;
  const days = perDay(rows, 14); const max = Math.max(1, ...days.map(d => d.n));
  const tops = topMerchants(hist); const topMax = Math.max(1, ...tops.map(t => t.total));
  const alerts = silentAlerts(configs, rows, usable);
  const recon = usable.map(a => {
    const last = rows.filter(r => String(r.account_id) === String(a.id) && findBalance(r.body) != null).sort((p, q) => new Date(q.received_at) - new Date(p.received_at))[0];
    if (!last) return null;
    const bank = findBalance(last.body); const mine = accountFlows(a, transactions).balance;
    return { name: a.name, bank, mine, diff: bank - mine, ok: Math.abs(bank - mine) < 0.5, when: new Date(last.received_at).toLocaleDateString() };
  }).filter(Boolean);
  const W = 560, H = 90; const pts = days.map((d, i) => `${(i * W / (days.length - 1)).toFixed(1)},${(H - 6 - d.n / max * (H - 14)).toFixed(1)}`);
  return <section className="sms-pane smi">
    <div className="smi-kpis">
      <div><small>SMS this month</small><b>{month.length}</b></div>
      <div><small>Approved</small><b>{decided.length ? `${pct}%` : '—'}</b><span>{approved.length} of {decided.length}</span></div>
      <div><small>Read correctly</small><b>{approved.length ? `${acc}%` : '—'}</b><span>{edited} corrected</span></div>
      <div><small>Auto-approved</small><b>{auto}</b></div>
    </div>
    <div className="smi-grid">
      <div className="smi-card"><h4>Top merchants</h4>{tops.length ? tops.map(t => <div className="smi-bar" key={t.name}><div><b>{t.name}</b><small>{fmt(t.total)} · {t.count}×</small></div><i><u style={{ width: `${t.total / topMax * 100}%` }} /></i></div>) : <p className="sms-hint">Approve a few SMS and your top merchants show up here.</p>}</div>
      <div className="smi-card"><h4>Check your balance</h4>{recon.length ? recon.map(r => <div className="smi-rec" key={r.name}><div><b>{r.name}</b><small>Bank said {fmt(r.bank)} on {r.when} · Pocket shows {fmt(r.mine)}</small></div>{r.ok ? <span className="sms-pill on"><CheckCircle2 size={13} /> Matches</span> : <span className="sms-pill warn">Off by {fmt(Math.abs(r.diff))}</span>}</div>) : <p className="sms-hint">When a bank SMS prints your balance, Pocket compares it with its own here.</p>}</div>
      <div className="smi-card"><h4>Needs attention</h4>{alerts.length || flagged.length ? <div className="smi-att">{alerts.map(a => <div className="smi-at warn" key={a.account}><span className="smi-at-ic"><AlertTriangle size={18} /></span><div className="smi-at-t"><b>{a.sender} went quiet</b><small>No SMS for {a.days} days · {a.account}</small></div><span className="smi-at-tag">Check phone</span></div>)}{flagged.slice(0, 3).map(x => <div className="smi-at bad" key={x.id}><span className="smi-at-ic"><TriangleAlert size={18} /></span><div className="smi-at-t"><b>{x._desc || x.sender || 'SMS'}</b><small>{x._why.join(' · ')}</small></div><span className="smi-at-amt">{fmt(Number(x._amount) || 0)}</span></div>)}</div> : <p className="sms-hint">Nothing odd right now.</p>}</div>
      <div className="smi-card wide"><h4>SMS per day · last 14 days</h4><svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Messages per day"><polyline points={pts.join(' ')} fill="none" stroke="var(--accent,#3157f6)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg><div className="smi-axis"><small>{days[0].d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small><small>Today</small></div></div>
    </div>
  </section>;
}
