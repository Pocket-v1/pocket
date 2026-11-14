import { useMemo, useState } from 'react';
import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { Star, X } from '../../lib/icons.jsx';
import { parseSms } from '../../lib/smsParser.js';
import { PLUS_DEFAULTS } from '../../lib/plus.js';

// Pieces that show people without Plus what it does and invite them to try it.
// Built from design-system parts: PageHeading, panel, buttons, sms-pill, Field-style label + textarea.

const fmtMoney = (n, c = 'EGP') => new Intl.NumberFormat('en-EG', { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(Number(n) || 0);
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } } };

function TrialButtons({ plus, settings, onStartTrial, onOpenPlus, primaryLabel }) {
  const [busy, setBusy] = useState(false);
  const days = Number({ ...PLUS_DEFAULTS, ...settings }.trial_days) || 14;
  if (plus.pending) return <button type="button" className="btn btn-secondary plus-teaser-btn" onClick={onOpenPlus}>Payment pending · see status</button>;
  return <div className="plus-teaser-actions">
    {!plus.trialUsed && <button type="button" className="btn btn-primary plus-teaser-btn" disabled={busy} onClick={async () => { setBusy(true); await onStartTrial(); setBusy(false); }}>{busy ? 'Starting…' : (primaryLabel || `Try free for ${days} days`)}</button>}
    <button type="button" className={`btn ${plus.trialUsed ? 'btn-primary' : 'btn-secondary'} plus-teaser-btn`} onClick={onOpenPlus}>{plus.trialUsed ? 'Get Pocket Plus' : 'See Pocket Plus'}</button>
  </div>;
}

// B · Bank SMS without Plus
export function LockedSmsTeaser(props) {
  const [text, setText] = useState('Your card ending 4821 was charged EGP 350.00 at UBER');
  const parsed = useMemo(() => { const r = parseSms(text); return r && r.amount ? r : null; }, [text]);
  return <div className="plus-teaser">
    <PageHeading eyebrow="AUTOMATIC TRACKING" title={<>Bank SMS <span className="plus-chip">Plus</span></>} subtitle="Your bank already texts you about every payment. Pocket turns those texts into transactions." />
    <div className="plus-teaser-grid">
      <section className="panel plus-teaser-card">
        <h2>Stop typing every payment</h2>
        <ol className="plus-steps">
          <li><span>1</span>Your bank sends you an SMS, like always</li>
          <li><span>2</span>Pocket reads the amount, shop and card</li>
          <li><span>3</span>You tap Approve. That is it.</li>
        </ol>
        <TrialButtons {...props} />
        <p className="small-muted">Works with CIB, NBE, QNB, Banque Misr and more.</p>
      </section>
      <section className="panel plus-teaser-card plus-try">
        <div className="plus-try-head"><h2>Try it now with one SMS</h2><span className="sms-pill on">Free</span></div>
        <label className="field"><span>Paste a bank SMS</span><textarea className="pocket-textarea" rows="3" value={text} onChange={e => setText(e.target.value)} /></label>
        {parsed ? <div className="plus-try-result"><div><b>{parsed.merchant || 'Payment'}</b><small>{parsed.type || 'Expense'}{parsed.last4 ? ` · card ${parsed.last4}` : ''} · today</small></div><b className="plus-try-amt">{parsed.type === 'Income' ? '+' : '−'}{fmtMoney(parsed.amount)}</b></div>
          : <p className="small-muted">Paste a payment SMS from your bank to see what Pocket reads.</p>}
        {parsed && <p className="small-muted">✓ Read right away. With Plus this happens on its own for every SMS.</p>}
      </section>
    </div>
    <div className="plus-divider"><span>Example of your inbox</span></div>
    <div className="plus-example-list" aria-label="Example, not your data">
      <div className="panel plus-example"><div className="plus-example-top"><small>CIB · 2 min ago</small><span className="sms-pill on">Sure</span></div><div className="plus-example-main"><b>SPINNEYS</b><b className="plus-example-amt">−1,240</b></div><small>Food &amp; Groceries · learned from last time</small><div className="plus-example-btns"><span>Dismiss</span><span className="on">Approve</span></div></div>
      <div className="panel plus-example"><div className="plus-example-main"><span><b>Salary · NBE</b><small>Auto-approved · yesterday</small></span><b className="plus-example-amt good">+18,000</b></div></div>
    </div>
  </div>;
}

// C · Vehicles without Plus (same layout as Bank SMS)
function fuelTry(text) {
  const nums = String(text).replace(/,/g, '').match(/\d+(\.\d+)?/g) || [];
  const [l, price, km] = nums.map(Number);
  if (!l || !price) return null;
  const lper100 = 7.4, perKm = (price / l) * lper100 / 100;
  return { l, price, km, lper100, perKm };
}
export function LockedVehiclesTeaser(props) {
  const [text, setText] = useState('30 L · EGP 472.50 · 84,250 km');
  const r = useMemo(() => fuelTry(text), [text]);
  return <div className="plus-teaser">
    <PageHeading eyebrow="CAR COSTS" title={<>Vehicles <span className="plus-chip">Plus</span></>} subtitle="Know what your car really costs every month, and never miss an oil change." />
    <div className="plus-teaser-grid">
      <section className="panel plus-teaser-card">
        <h2>Know what your car really costs</h2>
        <ol className="plus-steps">
          <li><span>1</span>Add your car and its odometer</li>
          <li><span>2</span>Log a fill-up or service in seconds</li>
          <li><span>3</span>Pocket shows cost per km and reminds you</li>
        </ol>
        <TrialButtons {...props} />
        <p className="small-muted">Fuel, service, parking and tolls in one place.</p>
      </section>
      <section className="panel plus-teaser-card plus-try">
        <div className="plus-try-head"><h2>Try it now with one fill-up</h2><span className="sms-pill on">Free</span></div>
        <label className="field"><span>Liters, price and odometer</span><input value={text} onChange={e => setText(e.target.value)} /></label>
        {r ? <div className="plus-try-result"><div><b>Fuel · {r.lper100} L / 100 km</b><small>{r.perKm.toFixed(2)} EGP per km · today</small></div><b className="plus-try-amt">−{fmtMoney(r.price)}</b></div>
          : <p className="small-muted">Write the liters and the price, like “30 L · EGP 472.50”.</p>}
        {r && <p className="small-muted">✓ Worked out right away. With Plus this updates on its own after every fill-up.</p>}
      </section>
    </div>
    <div className="plus-divider"><span>Example of your car</span></div>
    <div className="plus-example-list" aria-label="Example, not your data">
      <div className="panel plus-example"><div className="plus-example-top"><small>Toyota Corolla 2019 · 84,250 km</small><span className="sms-pill warn">Soon</span></div><div className="plus-example-main"><b>Oil change</b><b className="plus-example-amt">in 1,750 km</b></div><small>About 3 weeks at your pace · last one cost 1,800</small><div className="plus-example-btns"><span>Later</span><span className="on">Remind me</span></div></div>
      <div className="panel plus-example"><div className="plus-example-main"><span><b>Fuel · Wataniya</b><small>30 L · yesterday</small></span><b className="plus-example-amt">−450</b></div></div>
    </div>
  </div>;
}

// D · Overview card: how many transactions were typed by hand this month
export const isTypedByHand = t => t && t.type !== 'Transfer' && !/^(From bank SMS|Added by typing|Added from a receipt|Goal )/i.test(t.notes || '');

export function TypedByHandCard({ transactions = [], accounts = [], onTry, onOpenPlus, plus }) {
  const month = new Date().toISOString().slice(0, 7);
  const key = `pocket-plus-typed-${month}`;
  const [hidden, setHidden] = useState(() => store.get(key) === '1');
  const cardIds = new Set(accounts.filter(a => /bank|card|credit/i.test(a.type || '')).map(a => String(a.id)));
  const typed = transactions.filter(t => String(t.transaction_date || '').slice(0, 7) === month && isTypedByHand(t));
  const byCard = typed.filter(t => cardIds.has(String(t.account_id))).length;
  if (hidden || typed.length < 5 || plus?.active) return null;
  const mins = Math.max(1, Math.round(typed.length * 40 / 60));
  return <section className="plus-nudge" aria-label="Pocket Plus suggestion">
    <div className="plus-nudge-top"><span>THIS MONTH</span><button type="button" onClick={() => { store.set(key, '1'); setHidden(true); }}>Not now</button></div>
    <b className="plus-nudge-title">You typed {typed.length} transactions by hand.</b>
    <div className="plus-nudge-stats"><div><b>~{mins} min</b><small>Plus would have saved</small></div><div><b>{byCard} of {typed.length}</b><small>came from a bank or card, so had an SMS</small></div></div>
    <button type="button" className="btn plus-nudge-btn" onClick={plus?.trialUsed ? onOpenPlus : onTry}>{plus?.trialUsed ? 'See Pocket Plus' : 'Let Pocket do it · 14 days free'}</button>
  </section>;
}

// D2 · Transactions: hint about the latest card payment typed by hand
export function SmsHintBanner({ transactions = [], accounts = [], onTry, onOpenPlus, plus }) {
  const week = (() => { const d = new Date(); const j = new Date(d.getFullYear(), 0, 1); return `${d.getFullYear()}-${Math.ceil(((d - j) / 864e5 + j.getDay() + 1) / 7)}`; })();
  const [hidden, setHidden] = useState(() => store.get('pocket-plus-hint-off') === '1' || store.get('pocket-plus-hint-week') === week);
  const bankAcc = useMemo(() => new Map(accounts.filter(a => /bank|card|credit/i.test(a.type || '')).map(a => [String(a.id), a])), [accounts]);
  const recent = Date.now() - 7 * 864e5;
  const t = transactions.filter(x => x.type === 'Expense' && isTypedByHand(x) && bankAcc.has(String(x.account_id)) && new Date(x.created_at || x.transaction_date).getTime() >= recent)
    .sort((a, b) => new Date(b.created_at || b.transaction_date) - new Date(a.created_at || a.transaction_date))[0];
  if (hidden || !t || plus?.active) return null;
  const acc = bankAcc.get(String(t.account_id));
  return <div className="plus-hint" role="note">
    <Star size={16} aria-hidden="true" />
    <span>You paid <b>{t.description || t.category}</b> with {acc.name}, so your bank sent an SMS. With Plus this would already be here.</span>
    <button type="button" className="plus-hint-go" onClick={plus?.trialUsed ? onOpenPlus : onTry}>{plus?.trialUsed ? 'See Plus' : 'Try free'}</button>
    <button type="button" className="plus-hint-x" aria-label="Not now" onClick={() => { store.set('pocket-plus-hint-week', week); setHidden(true); }}><X size={14} /></button>
  </div>;
}
