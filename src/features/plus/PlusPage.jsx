import { useRef, useState } from 'react';
import { readPaymentShot } from '../../lib/receiptReader.js';
import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { ModalShell } from '../../components/modals/ModalShell.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Car, Check, Copy, MessageSquare, Sparkles, Receipt, Mic, Clock, CheckCircle2, TriangleAlert, Star, Landmark, Smartphone, Camera, X } from '../../lib/icons.jsx';
import { PLUS_DEFAULTS } from '../../lib/plus.js';

// Pocket Plus for regular users: paywall, free trial, pay (InstaPay / wallet), and "Your plan".
// Built only from design-system pieces: PageHeading, panel, Tabs, ModalShell, Field, cc-options, sms-pill, buttons.
const fmtDate = v => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const PITCH_PERKS = [
  [MessageSquare, 'Bank SMS', 'Every card payment, ready to approve'],
  [Mic, 'Say it', '“صرفت 200 على أكل” and done'],
  [Receipt, 'Snap a receipt', 'Total, shop and date read for you'],
  [Car, 'Vehicles', 'Fuel, service and cost per km'],
];
const PERKS = [
  [MessageSquare, 'Bank SMS', 'Card payments and transfers arrive ready to approve. No typing.'],
  [Sparkles, 'Learns your shops', 'Regular shops are filled in and can be approved automatically.'],
  [Mic, 'Add by voice', 'Say “صرفت 200 على أكل” and check the card.'],
  [Receipt, 'Snap a receipt', 'Pocket reads the total, shop and date from the photo.'],
  [Car, 'Vehicles', 'Fuel, service and running costs for each car.'],
];

function PayModal({ settings, currency, onClose, onSubmit, initialPeriod }) {
  const s = { ...PLUS_DEFAULTS, ...settings };
  const [period, setPeriod] = useState(initialPeriod && Number(s[`${initialPeriod}_price`]) > 0 ? initialPeriod : Number(s.yearly_price) > 0 ? 'yearly' : 'monthly');
  const methods = [s.instapay && ['instapay', 'InstaPay', s.instapay, 'Your InstaPay address (name@instapay)'], s.wallet && ['wallet', 'Mobile wallet', s.wallet, 'The wallet number you sent from']].filter(Boolean);
  const [method, setMethod] = useState(methods[0]?.[0] || '');
  const [handle, setHandle] = useState('');
  const [ref, setRef] = useState('');
  const [name, setName] = useState('');
  const [shot, setShot] = useState(null); // { blob, url, status: 'reading'|'ok'|'warn', notes: [] }
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const price = Number(s[`${period}_price`]) || 0;
  const m = methods.find(x => x[0] === method);
  const money = n => new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  const monthlyYear = Number(s.monthly_price) * 12;
  const saving = Number(s.yearly_price) > 0 && monthlyYear > Number(s.yearly_price) ? Math.round((monthlyYear - Number(s.yearly_price)) / Number(s.monthly_price)) : 0;
  async function copy() { try { await navigator.clipboard.writeText(m[2]); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }
  const ipnLink = /^https:\/\/ipn\.eg\/S\/[^/\s]+\/instapay\/[A-Za-z0-9]+\/?$/i.test(s.instapay_link || '') ? s.instapay_link : '';
  async function openApp() {
    try { await navigator.clipboard.writeText(m[2]); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
    if (ipnLink) window.location.href = ipnLink;
  }
  async function readShot(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setShot({ blob: file, url, status: 'reading', progress: 0, notes: [] });
    try {
      const r = await readPaymentShot(file, pr => setShot(o => o && { ...o, progress: pr }));
      const notes = []; let bad = false;
      const want = String(m?.[2] || '').toLowerCase();
      if (method === 'instapay' && r.handles.length) { if (want && !r.handles.includes(want)) { bad = true; notes.push(`This went to ${r.handles[0]}, not ${m[2]}.`); } else notes.push(`Sent to ${want || r.handles[0]}`); }
      if (r.amount) { if (r.amount + 0.001 < price) { bad = true; notes.push(`The amount is ${money(r.amount)}. The plan is ${money(price)}.`); } else notes.push(`Amount ${money(r.amount)}`); }
      if (r.date && (Date.now() - new Date(`${r.date}T23:59:59`).getTime()) > 3 * 864e5) { bad = true; notes.push('This transfer is more than 2 days old.'); }
      if (r.ref) { setRef(v => v || r.ref); notes.push(`Transaction number ${r.ref}`); }
      if (method === 'wallet' && r.phones.length && !handle) setHandle(r.phones.find(x => x !== String(m?.[2] || '').replace(/\D/g, '')) || '');
      if (!r.amount && !r.ref) notes.push('We could not read it well. Fill in the details below.');
      setShot({ blob: r.blob || file, url, status: bad ? 'warn' : 'ok', notes });
    } catch { setShot({ blob: file, url, status: 'warn', notes: ['We could not read it. Fill in the details below.'] }); }
  }
  async function go() {
    if (shot?.status === 'reading') { setErr('Wait a moment, we are still reading the screenshot.'); return; }
    if (!handle.trim()) { setErr(method === 'wallet' ? 'Add the wallet number you sent from, so we can find your payment.' : 'Add your InstaPay address, so we can find your payment.'); return; }
    if (method === 'instapay' && !name.trim() && !ref.trim()) { setErr('Add your name as it shows in your bank, or the transaction number, so we can find your payment.'); return; }
    setBusy(true); setErr('');
    const ok = await onSubmit({ period, method, handle: handle.trim(), ref: ref.trim(), name: name.trim(), proof: shot?.blob || null, amount: price });
    setBusy(false);
    if (!ok) setErr('Could not send it. Check your connection and try again.');
  }
  const tabs = [Number(s.daily_price) > 0 && { key: 'daily', label: '1 day' }, Number(s.monthly_price) > 0 && { key: 'monthly', label: 'Monthly' }, Number(s.yearly_price) > 0 && { key: 'yearly', label: saving ? `Yearly · ${saving} month${saving === 1 ? '' : 's'} free` : 'Yearly' }].filter(Boolean);
  return <ModalShell title="Pay for Pocket Plus" subtitle="Send the amount, then tell us where it came from. We turn Plus on as soon as we see it." onClose={onClose}>
    <div className="plus-pay">
    {tabs.length > 1 && <Tabs label="Billing period" value={period} onChange={setPeriod} items={tabs} />}
    <div className="plus-amount">
      <div className="plus-amount-t"><span className="plus-chip gold">Plus</span><b>{period === 'yearly' ? 'Yearly plan' : period === 'daily' ? '1-day pass' : 'Monthly plan'}</b><small>{period === 'yearly' ? `Pay once for 12 months · about ${money(price / 12)} a month` : period === 'daily' ? 'Plus for 24 hours · does not renew' : 'Pay for 1 month · cancel any time'}</small></div>
      <div className="plus-amount-n"><b>{money(price)}</b><small>{period === 'yearly' ? 'per year' : period === 'daily' ? 'for 1 day' : 'per month'}</small></div>
    </div>
    <div className="cc-options" role="radiogroup" aria-label="How you pay">
      {methods.map(([k, label, to]) => <button key={k} type="button" role="radio" aria-checked={method === k} className={`cc-option plus-method ${method === k ? 'on' : ''}`} onClick={() => setMethod(k)}><span className={`plus-method-ic ${k}`}>{k === 'wallet' ? <Smartphone size={20} /> : <Landmark size={20} />}</span><span><b>{label}</b><small>Send to {to}</small></span></button>)}
    </div>
    {m && <div className="plus-sendto"><div><small>Send {money(price)} to</small><b>{m[2]}</b></div><div className="plus-sendto-actions"><button type="button" className="btn btn-secondary btn-sm" onClick={copy}>{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}</button>{method === 'instapay' && ipnLink && <button type="button" className="btn btn-primary btn-sm plus-open-app" onClick={openApp}>Open InstaPay</button>}</div></div>}
    {m && method === 'instapay' && ipnLink && <p className="small-muted plus-open-note">Opens InstaPay with {m[2]} filled in. Type {money(price)} and send.</p>}
    <div className="plus-shot">
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { readShot(e.target.files?.[0]); e.target.value = ''; }} />
      {!shot ? <button type="button" className="plus-shot-drop" onClick={() => fileRef.current?.click()}><span className="plus-method-ic instapay"><Camera size={20} /></span><span><b>Add the transfer screenshot</b><small>Pocket reads it and fills the details. It also makes confirming faster.</small></span></button>
        : <div className={`plus-shot-card ${shot.status}`}><img src={shot.url} alt="Your transfer screenshot" /><div className="plus-shot-t"><b>{shot.status === 'reading' ? `Reading… ${shot.progress || 0}%` : shot.status === 'ok' ? 'Screenshot checked' : 'Please check this'}</b>{shot.notes.map(n => <small key={n}>{n}</small>)}</div><button type="button" className="plus-hint-x" aria-label="Remove screenshot" onClick={() => setShot(null)}><X size={14} /></button></div>}
    </div>
    <div className="form-grid">
      {method === 'instapay' && <Field label="Your name as it shows in your bank" wide hint="We match it with the name in our bank message."><input value={name} onChange={e => setName(e.target.value)} placeholder="Ahmed Mohamed Ali" autoComplete="name" /></Field>}
      <Field label={m?.[3] || 'Paid from'} wide><input value={handle} onChange={e => setHandle(e.target.value)} placeholder={method === 'wallet' ? '010…' : 'name@instapay'} autoComplete="off" /></Field>
      <Field label="Transaction number (optional)" wide hint={method === 'instapay' ? 'In InstaPay: the transfer details, “Reference”.' : undefined}><input value={ref} onChange={e => setRef(e.target.value)} placeholder="From the confirmation screen or SMS" autoComplete="off" /></Field>
    </div>
    {err && <p className="cc-error" role="alert">{err}</p>}
    <p className="small-muted">Plus usually turns on by itself within minutes of your payment arriving. If not, we check it by hand within a day. You keep any free-trial days left.</p>
    </div>
    <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy || !method || !price} onClick={go}>{busy ? 'Sending…' : 'I sent the money'}</button></div>
  </ModalShell>;
}

export function PlusPage({ plus, settings, currency = 'EGP', onStartTrial, onPay, onCancelToggle, onOpenSms }) {
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const s = { ...PLUS_DEFAULTS, ...settings };
  const canPay = (Number(s.daily_price) > 0 || Number(s.monthly_price) > 0 || Number(s.yearly_price) > 0) && (s.instapay || s.wallet);
  const money = n => new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(n) || 0);
  const from = Number(s.monthly_price) > 0 ? `${money(s.monthly_price)}/month` : Number(s.yearly_price) > 0 ? `${money(s.yearly_price)}/year` : '';
  async function trial() { setBusy(true); await onStartTrial(); setBusy(false); }
  const cur = plus.current;

  const status = (() => {
    if (plus.pending) return <section className="panel plus-status"><span className="plus-status-ic warn"><Clock size={20} /></span><div className="plus-status-t"><b>Payment sent. Plus turns on as soon as it arrives</b><small>{money(plus.pending.amount)} · {plus.pending.payment_method === 'instapay' ? 'InstaPay' : 'Wallet'} from {plus.pending.payer_handle} · {fmtDate(plus.pending.created_at)}</small></div><span className="sms-pill warn">Pending</span></section>;
    if (plus.active && plus.kind === 'trial') return <section className="panel plus-status"><span className="plus-status-ic brand"><Star size={20} /></span><div className="plus-status-t"><b>Free trial · {plus.daysLeft} {plus.daysLeft === 1 ? 'day' : 'days'} left</b><small>Ends {fmtDate(plus.endsAt)}. Pay before then to keep Bank SMS.</small><div className="plus-track"><i style={{ width: `${Math.max(4, Math.min(100, (1 - plus.daysLeft / (Number(s.trial_days) || 14)) * 100))}%` }} /></div></div><span className="sms-pill on">Trial</span></section>;
    if (plus.active) return <section className="panel plus-status"><span className="plus-status-ic ok"><CheckCircle2 size={20} /></span><div className="plus-status-t"><b>Pocket Plus is on</b><small>{plus.kind === 'gift' ? (plus.endsAt ? `Given by the Owner until ${fmtDate(plus.endsAt)}` : 'Given by the Owner, no end date') : `${cur.period === 'yearly' ? 'Yearly' : 'Monthly'} · ${cur.cancel_at_period_end ? 'ends' : 'renews'} ${fmtDate(plus.endsAt)}`}</small></div><span className="sms-pill on">Active</span></section>;
    if (plus.rejected) return <section className="panel plus-status"><span className="plus-status-ic bad"><TriangleAlert size={20} /></span><div className="plus-status-t"><b>We couldn’t find your payment</b><small>{plus.rejected.admin_note || 'Check the amount and where you sent it, then send the details again.'}</small></div></section>;
    if (plus.ended) return <section className="panel plus-status"><span className="plus-status-ic bad"><TriangleAlert size={20} /></span><div className="plus-status-t"><b>Your Plus ended</b><small>Bank SMS is paused. Your saved transactions stay.</small></div></section>;
    return null;
  })();

  const primary = plus.pending ? null
    : !plus.trialUsed ? <button type="button" className="btn btn-primary plus-cta" disabled={busy} onClick={trial}>{busy ? 'Starting…' : `Try free for ${Number(s.trial_days) || 14} days`}</button>
    : canPay && (!plus.active || plus.kind === 'trial' || cur?.cancel_at_period_end || (plus.daysLeft != null && plus.daysLeft <= 7)) ? <button type="button" className="btn btn-primary plus-cta" onClick={() => setPayOpen(true)}>{plus.active && plus.kind !== 'trial' ? 'Pay to renew' : 'Pay to keep Plus'}</button>
    : null;

  if (!plus.active) return <PlusPitch plus={plus} s={s} canPay={canPay} money={money} status={status} busy={busy} onTrial={trial} payOpen={payOpen} setPayOpen={setPayOpen} currency={currency} onPay={onPay} />;

  return <div className="plus-page">
    <PageHeading eyebrow="POCKET PLUS" title="Your plan" subtitle="Bank SMS, Vehicles and the chat are on for you." />
    {status}
    <div className="plus-grid">
      <section className="panel plus-perks">
        <div className="panel-header"><div><h2>What Plus adds</h2><p>Everything else in Pocket stays free.</p></div></div>
        <ul className="plus-perk-list">{PERKS.map(([Icon, title, text]) => <li key={title}><span className="plus-perk-ic"><Icon size={18} /></span><div><b>{title}</b><small>{text}</small></div></li>)}</ul>
      </section>
      <section className="panel plus-side">
        <div className="panel-header"><div><h2>Manage</h2><p>{from ? `From ${from}` : ''}</p></div></div>
        {primary}
        {onOpenSms && <button type="button" className="btn btn-secondary plus-cta" onClick={onOpenSms}>Open Bank SMS</button>}
        {plus.kind === 'paid' && <button type="button" className="btn btn-secondary plus-cta" onClick={() => onCancelToggle(cur)}>{cur.cancel_at_period_end ? 'Keep renewing' : 'Cancel at the end of the period'}</button>}
        <p className="small-muted">Pay with InstaPay or a mobile wallet. No card details are stored in Pocket.</p>
      </section>
    </div>
    {payOpen && <PayModal settings={s} currency={currency} onClose={() => setPayOpen(false)} onSubmit={async d => { const ok = await onPay(d); if (ok) setPayOpen(false); return ok; }} />}
  </div>;
}

// A · The Plus page for people who don't have it yet: hero with the SMS → transaction demo, features, Free vs Plus, prices, one clear button.
function PlusPitch({ plus, s, canPay, money, status, busy, onTrial, payOpen, setPayOpen, currency, onPay }) {
  const m = Number(s.monthly_price) || 0, y = Number(s.yearly_price) || 0, dd = Number(s.daily_price) || 0;
  const [period, setPeriod] = useState(y > 0 ? 'yearly' : m > 0 ? 'monthly' : 'daily');
  const save = m > 0 && y > 0 && m * 12 > y ? Math.round((m * 12 - y) / m) : 0;
  const days = Number(s.trial_days) || 14;
  const rows = [['Accounts, budgets, goals, bills', true], ['Reports and calendar', true], ['Bank SMS, auto-approve', false], ['Voice and receipt photos', false], ['Vehicles', false]];
  const payBtn = canPay ? <button type="button" className="btn btn-primary plus-pitch-cta" onClick={() => setPayOpen(true)}>Subscribe now</button> : null;
  const trialBtn = !plus.trialUsed ? <button type="button" className={`btn ${canPay ? 'btn-secondary' : 'btn-primary'} plus-pitch-cta`} disabled={busy} onClick={onTrial}>{busy ? 'Starting…' : `Try free for ${days} days`}</button> : null;
  const cta = plus.pending ? null : <>{payBtn}{trialBtn}</>;
  return <div className="plus-pitch">
    <section className="plus-hero">
      <div className="plus-hero-copy">
        <span className="plus-hero-eyebrow"><Star size={14} /> POCKET PLUS</span>
        <h1>Pocket writes it down for you.</h1>
        <p>Bank SMS, receipts and your voice become transactions. You just tap Approve.</p>
      </div>
      <div className="plus-live" aria-hidden="true">
        <div className="plus-live-head"><span><i />LIVE · WATCH IT WORK</span><span className="plus-chip gold">Plus</span></div>
        <div className="plus-live-stage">
          <div className="plus-live-sms"><b>CIB · SMS</b>Card 4821 charged EGP 350.00 at UBER</div>
          <div className="plus-live-scan"><span /></div>
          <div className="plus-live-card"><span className="plus-live-ic"><MessageSquare size={15} /></span><span className="plus-live-t"><b>UBER · Transport</b><small>CIB 4821 · just now</small></span><span className="plus-live-r"><b>−350</b><span className="plus-live-ok">✓ Approved</span></span></div>
        </div>
      </div>
    </section>
    {status}
    <div className="plus-pitch-body">
      <div className="plus-pitch-main">
      <div className="plus-feature-grid">{PITCH_PERKS.map(([Icon, title, text], i) => <div className={`plus-feature tone-${i}`} key={title}><span className="plus-feature-ic"><Icon size={18} /></span><b>{title}</b><small>{text}</small></div>)}</div>
      <section className="panel plus-compare" aria-label="Free and Plus compared">
        <div className="plus-compare-row head"><span>What you get</span><span>Free</span><span>Plus</span></div>
        {rows.map(([t, free]) => <div className="plus-compare-row" key={t}><span>{t}</span><span className={free ? 'yes' : 'no'}>{free ? '✓' : '—'}</span><span className="yes">✓</span></div>)}
      </section>
      </div>
      <aside className="panel plus-checkout" aria-label="Choose your plan">
      <div className="plus-checkout-head"><b>Choose your plan</b><small>Subscribe now, or try it free first.</small></div>
      {(m > 0 || y > 0 || dd > 0) && <div className="plus-prices" role="radiogroup" aria-label="Billing period">
        {y > 0 && <button type="button" role="radio" aria-checked={period === 'yearly'} className={`plus-price ${period === 'yearly' ? 'on' : ''}`} onClick={() => setPeriod('yearly')}>{save > 0 && <span className="plus-price-tag">Best value · {save} month{save === 1 ? '' : 's'} free</span>}<span className="plus-price-t"><b>Yearly</b><small>{money(y)} a year · about {money(y / 365)} a day</small></span><b className="plus-price-n">{money(y)}</b></button>}
        {m > 0 && <button type="button" role="radio" aria-checked={period === 'monthly'} className={`plus-price ${period === 'monthly' ? 'on' : ''}`} onClick={() => setPeriod('monthly')}><span className="plus-price-t"><b>Monthly</b><small>Cancel any time</small></span><b className="plus-price-n">{money(m)}</b></button>}
        {dd > 0 && <button type="button" role="radio" aria-checked={period === 'daily'} className={`plus-price ${period === 'daily' ? 'on' : ''}`} onClick={() => setPeriod('daily')}><span className="plus-price-t"><b>1 day</b><small>Try Plus for 24 hours · no renewal</small></span><b className="plus-price-n">{money(dd)}</b></button>}
      </div>}
      <div className="plus-pitch-foot">
        {cta}
        {plus.trialUsed && !canPay && <p className="small-muted">Payments are not open yet. Ask the Owner to turn Plus on for you.</p>}
        <div className="plus-trust"><span>✓ No card needed</span><span>✓ Reminder before it ends</span><span>✓ Cancel any time</span></div>
      </div>
      </aside>
    </div>
    {payOpen && <PayModal settings={s} currency={currency} initialPeriod={period} onClose={() => setPayOpen(false)} onSubmit={async d => { const ok = await onPay(d); if (ok) setPayOpen(false); return ok; }} />}
  </div>;
}

// Shown on top of Bank SMS / Vehicles for users without Plus: the page is visible, but locked until they subscribe.
export function PlusLockBanner({ feature, plus, settings, onStartTrial, onOpenPlus }) {
  const [busy, setBusy] = useState(false);
  const s = { ...PLUS_DEFAULTS, ...settings };
  const name = feature === 'vehicle_management' ? 'Vehicles' : 'Bank SMS';
  const why = feature === 'vehicle_management' ? 'Track fuel, service and running costs for each car.' : 'Let your bank SMS fill Pocket for you, ready to approve.';
  return <section className="panel plus-lock" role="region" aria-label={`${name} needs Pocket Plus`}>
    <span className="plus-status-ic brand"><Star size={20} /></span>
    <div className="plus-status-t"><b>{name} is part of Pocket Plus</b><small>{plus.pending ? 'Your payment is waiting for confirmation. This opens as soon as it is confirmed.' : plus.ended ? `Your Plus ended. ${why}` : why}</small></div>
    <div className="plus-lock-actions">
      {!plus.trialUsed && <button type="button" className="btn btn-primary" disabled={busy} onClick={async () => { setBusy(true); await onStartTrial(); setBusy(false); }}>{busy ? 'Starting…' : `Try free for ${Number(s.trial_days) || 14} days`}</button>}
      <button type="button" className={`btn ${plus.trialUsed ? 'btn-primary' : 'btn-secondary'}`} onClick={onOpenPlus}>{plus.pending ? 'See status' : 'See plans'}</button>
    </div>
  </section>;
}
