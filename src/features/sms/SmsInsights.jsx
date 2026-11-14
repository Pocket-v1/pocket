import { AlertTriangle, CheckCircle2, TriangleAlert, MessageSquare, ShieldCheck, Sparkles, Target, Landmark } from '../../lib/icons.jsx';
import { useMemo } from 'react';
import { MetricCard } from '../../components/ui/MetricCard.jsx';
import { accountFlows } from '../../lib/credit.js';
import { findBalance } from '../../lib/smsParser.js';
import { perDay, silentAlerts, topMerchants } from '../../lib/smsInsights.js';

// Bank SMS → Insights tab. Built only from design-system pieces: MetricCard, panel, StatusChip (sms-pill), empty state.
function Empty({ icon: Icon, text }) {
  return <div className="smi-empty"><span className="smi-empty-ic"><Icon size={18} aria-hidden="true" /></span><p>{text}</p></div>;
}

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
  const days = perDay(rows, 14); const max = Math.max(1, ...days.map(d => d.n)); const total14 = days.reduce((s, d) => s + d.n, 0);
  const tops = topMerchants(hist).slice(0, 5); const topMax = Math.max(1, ...tops.map(t => t.total));
  const alerts = silentAlerts(configs, rows, usable);
  const recon = usable.map(a => {
    const last = rows.filter(r => String(r.account_id) === String(a.id) && findBalance(r.body) != null).sort((p, q) => new Date(q.received_at) - new Date(p.received_at))[0];
    if (!last) return null;
    const bank = findBalance(last.body); const mine = accountFlows(a, transactions).balance;
    return { name: a.name, bank, mine, diff: bank - mine, ok: Math.abs(bank - mine) < 0.5, when: new Date(last.received_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) };
  }).filter(Boolean);
  const attention = alerts.length + flagged.length;
  const dayLabel = d => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return <div className="smi">
    <div className="metric-grid smi-metrics">
      <MetricCard label="SMS this month" value={String(month.length)} icon={MessageSquare} tone="blue" note={`${rows.filter(r => r.status === 'pending').length} waiting for review`} />
      <MetricCard label="Approved" value={decided.length ? `${pct}%` : '—'} icon={CheckCircle2} tone="green" note={decided.length ? `${approved.length} of ${decided.length} reviewed` : 'Nothing reviewed yet'} />
      <MetricCard label="Read correctly" value={approved.length ? `${acc}%` : '—'} icon={Target} tone="purple" note={approved.length ? (edited ? `${edited} fixed by you` : 'No fixes needed') : 'Approve a few to see this'} />
      <MetricCard label="Auto-approved" value={String(auto)} icon={Sparkles} tone="orange" note={auto ? 'Saved without a tap' : 'Turn on rules for regular shops'} />
    </div>

    <div className="smi-grid">
      <section className="panel smi-panel smi-wide">
        <div className="panel-header"><div><h2>Messages per day</h2><p>{total14} in the last 14 days</p></div></div>
        <div className="smi-bars" role="img" aria-label={`Messages per day, ${total14} in the last 14 days`}>
          {days.map((d, i) => <div key={i} className={`smi-bar-col ${i === days.length - 1 ? 'is-today' : ''}`} title={`${dayLabel(d.d)}: ${d.n}`}>
            {d.n > 0 && <em>{d.n}</em>}<i style={{ height: `${d.n ? Math.max(8, d.n / max * 100) : 3}%` }} />
          </div>)}
        </div>
        <div className="smi-axis"><small>{dayLabel(days[0].d)}</small><small>{dayLabel(days[Math.floor(days.length / 2)].d)}</small><small>Today</small></div>
      </section>

      <section className="panel smi-panel">
        <div className="panel-header"><div><h2>Needs attention</h2><p>{attention ? `${attention} to check` : 'Everything looks normal'}</p></div></div>
        {attention ? <div className="smi-list">
          {alerts.map(a => <div className="smi-row" key={a.account}><span className="smi-row-ic warn"><AlertTriangle size={17} /></span><div className="smi-row-t"><b>{a.sender} went quiet</b><small>No SMS for {a.days} days · {a.account}</small></div><span className="sms-pill warn">Check phone</span></div>)}
          {flagged.slice(0, 4).map(x => <div className="smi-row" key={x.id}><span className="smi-row-ic bad"><TriangleAlert size={17} /></span><div className="smi-row-t"><b>{x._desc || x.sender || 'SMS'}</b><small>{x._why.join(' · ')}</small></div><b className="smi-row-amt">{fmt(Number(x._amount) || 0)}</b></div>)}
        </div> : <Empty icon={ShieldCheck} text="No new shops, odd amounts or quiet banks right now." />}
      </section>

      <section className="panel smi-panel">
        <div className="panel-header"><div><h2>Top merchants</h2><p>From approved SMS</p></div></div>
        {tops.length ? <ol className="smi-list smi-tops">
          {tops.map((t, i) => <li className="smi-top" key={t.name}><span className="smi-rank">{i + 1}</span><div className="smi-top-t"><div><b>{t.name}</b><span>{fmt(t.total)}</span></div><i><u style={{ width: `${t.total / topMax * 100}%` }} /></i><small>{t.count} {t.count === 1 ? 'payment' : 'payments'}</small></div></li>)}
        </ol> : <Empty icon={MessageSquare} text="Approve a few SMS and your top shops show up here." />}
      </section>

      <section className="panel smi-panel smi-wide">
        <div className="panel-header"><div><h2>Check your balance</h2><p>Bank SMS balance vs Pocket</p></div></div>
        {recon.length ? <div className="smi-list">
          {recon.map(r => <div className="smi-row" key={r.name}><span className="smi-row-ic brand"><Landmark size={17} /></span><div className="smi-row-t"><b>{r.name}</b><small>Bank {fmt(r.bank)} on {r.when} · Pocket {fmt(r.mine)}</small></div>{r.ok ? <span className="sms-pill on"><CheckCircle2 size={13} /> Matches</span> : <span className="sms-pill warn">Off by {fmt(Math.abs(r.diff))}</span>}</div>)}
        </div> : <Empty icon={Landmark} text="When a bank SMS shows your balance, Pocket compares it with its own here." />}
      </section>
    </div>
  </div>;
}
