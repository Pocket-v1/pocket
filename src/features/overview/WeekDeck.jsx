import { ChevronLeft, ChevronRight } from 'lucide-react';

const compact = n => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.abs(n));
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sign = e => (e.kind === 'income' ? '+' : '−');

// Week of tall day cards + a belt of upcoming bills. Cards open the day in the panel below.
export function WeekDeck({ events, selected, setSelected, month, todayKey, fmt }) {
  const sel = new Date(`${selected}T12:00:00`);
  const start = new Date(sel); start.setDate(sel.getDate() - ((sel.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const nets = week.map(d => (events[iso(d)] || []).reduce((t, e) => t + (e.kind === 'income' ? e.amount : e.kind === 'expense' ? -e.amount : 0), 0));
  const max = Math.max(1, ...nets.map(Math.abs));
  const move = n => { const d = new Date(sel); d.setDate(sel.getDate() + n); const k = iso(d); if (k.slice(0, 7) === month) setSelected(k); };
  const fmtRange = `${week[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${week[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  const upcoming = Object.entries(events).filter(([k]) => k >= todayKey).flatMap(([k, list]) => list.filter(e => e.kind === 'due').map(e => ({ ...e, date: k }))).sort((a, b) => a.date.localeCompare(b.date));
  const loop = upcoming.length >= 4;
  const belt = loop ? [...upcoming, ...upcoming, ...upcoming, ...upcoming] : upcoming;
  return <section className="cfd" aria-label="This week">
    <div className="cfd-head">
      <button type="button" className="icon-btn" aria-label="Previous week" onClick={() => move(-7)}><ChevronLeft size={18} /></button>
      <b>{selected.slice(0, 7) === todayKey.slice(0, 7) && week.some(d => iso(d) === todayKey) ? 'This week' : 'Week'} · {fmtRange}</b>
      <button type="button" className="icon-btn" aria-label="Next week" onClick={() => move(7)}><ChevronRight size={18} /></button>
      <span className="cfd-hint">Tap a card to open the day</span>
    </div>
    <div className="cfd-row" key={iso(week[0])}>
      {week.map((d, i) => {
        const k = iso(d); const inMonth = k.slice(0, 7) === month; const ev = inMonth ? (events[k] || []) : [];
        const net = nets[i]; const isToday = k === todayKey; const hasDue = ev.some(e => e.kind === 'due');
        const tone = isToday ? 'today' : !inMonth ? 'out' : net > 0 ? 'pos' : net < 0 ? 'neg' : hasDue ? 'due' : 'empty';
        const tag = isToday ? 'Today' : !inMonth ? '' : k < todayKey ? (ev.length ? 'Done' : '·') : hasDue ? 'Due' : 'Free';
        const shown = ev.slice(0, 2);
        return <button type="button" key={k} disabled={!inMonth} onClick={() => setSelected(k)} aria-pressed={selected === k}
          className={`cfd-card cfd-${tone} ${selected === k ? 'is-sel' : ''}`} style={{ '--i': i, '--rz': `${[-5, -3, -1, 1, 0, 3, 5][i]}deg` }}>
          <span className="cfd-top"><span>{d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</span><span>{tag}</span></span>
          <span className="cfd-day">{d.getDate()}</span>
          <span className="cfd-fill"><i style={{ '--w': `${Math.max(ev.length ? 6 : 3, Math.abs(net) / max * 100)}%` }} /></span>
          <span className="cfd-items">{shown.map((e, j) => <span key={j}><span>{e.title}</span><b>{sign(e)}{compact(e.amount)}</b></span>)}{ev.length > 2 && <small>+{ev.length - 2} more</small>}</span>
          <span className="cfd-net">{ev.length ? `${net >= 0 ? '+' : '−'}${compact(net)}` : '·'}</span>
        </button>;
      })}
    </div>
    {upcoming.length > 0 && <div className="cfd-upwrap">
      <div className="cfd-uptitle">Coming up</div>
      <div className={`cfd-belt-mask ${loop ? 'loop' : ''}`}>
        <div className={`cfd-belt ${loop ? 'run' : ''}`}>
          {belt.map((e, i) => <button type="button" className="cfd-pill" key={i} onClick={() => setSelected(e.date)}><i /><b>{e.title}</b><span>{new Date(`${e.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span><b className="amt">{fmt(e.amount)}</b></button>)}
        </div>
      </div>
    </div>}
  </section>;
}
