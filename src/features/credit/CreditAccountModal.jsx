import { ArrowUpRight, Check, ChevronLeft, CreditCard, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { ModalShell } from '../../components/modals/ModalShell.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { WizardProgress } from '../../components/ui/WizardProgress.jsx';
import { PROVIDER_PRESETS, cardCycle, isMoneyAccount, money } from '../../lib/credit.js';
import { localISODate, shortDate } from '../../lib/format.js';
import { PaymentCard } from './CreditSummary.jsx';
import { PROVIDER_THEMES } from '../../lib/providerThemes.js';

const COLORS = [['#6c7cf5', 'Indigo'], ['#50b99a', 'Green'], ['#f5b85b', 'Amber'], ['#ee8291', 'Rose']];

// One wizard for both a credit card and an installment app (Valu, Aman, Halan...).
export function CreditAccountModal({ kind = 'card', initial, accounts = [], onClose, onSave, currency = 'EGP' }) {
  const isCardKind = kind === 'card';
  const fmt = money(currency);
  const moneyAccounts = accounts.filter(isMoneyAccount);
  const [step, setStep] = useState(1);
  const startsAsPreset = PROVIDER_PRESETS.includes(initial?.name);
  const [f, S] = useState({
    preset: initial ? (startsAsPreset ? initial.name : 'Other') : '',
    name: initial?.name || '',
    limit: initial?.credit_limit ?? '',
    pay_from: initial?.pay_from_account_id || moneyAccounts[0]?.id || '',
    owed: initial ? Math.max(0, -Number(initial.opening_balance || 0)) : '',
    owed_date: initial?.opening_balance_date || localISODate(),
    statement_day: initial?.statement_day ?? '',
    grace_days: initial?.grace_days ?? 25,
    color: initial?.color || '#6c7cf5'
  });
  const set = (k, v) => S(s => ({ ...s, [k]: v }));
  // Picking an app also fills the name, so saving always has one.
  const pickPreset = preset => S(s => ({ ...s, preset, color: PROVIDER_THEMES[preset]?.a || s.color, name: preset === 'Other' ? (PROVIDER_PRESETS.includes(s.name) ? '' : s.name) : preset }));
  const total = isCardKind ? 3 : 2;
  const labels = isCardKind ? ['Card details', 'Billing dates', 'Review'] : ['App details', 'Review'];
  const reviewStep = total;
  const name = isCardKind ? f.name.trim() : (f.preset === 'Other' ? f.name.trim() : f.preset);
  const payFromName = moneyAccounts.find(a => String(a.id) === String(f.pay_from))?.name || 'Not selected';

  // Live example so the due-date rule is obvious: buy the day after the statement and you get the longest time.
  const exampleHTML = (() => {
    const day = Number(f.statement_day);
    if (!day || day < 1 || day > 28) return null;
    const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
    const iso = (yy, mm, dd) => new Date(Date.UTC(yy, mm, dd)).toISOString().slice(0, 10);
    const card = { statement_day: day, grace_days: Number(f.grace_days) };
    const after = iso(y, m, day + 1), on = iso(y, m, day);
    const a = cardCycle(after, card), b = cardCycle(on, card);
    return { after, a, on, b };
  })();

  const preview = <div className="pc-preview"><PaymentCard account={{ name: name || (isCardKind ? 'Card name' : 'Choose an app'), color: f.color }} kind={isCardKind ? 'card' : 'app'} used={0} limit={Number(f.limit) || 0} next={null} currency={currency} /></div>;
  const submit = e => { e.preventDefault(); if (step < reviewStep) { setStep(s => s + 1); return; } onSave({ ...f, kind, name }); };
  const typeLabel = isCardKind ? 'Credit card' : 'Installment app';
  const Icon = isCardKind ? CreditCard : ShoppingBag;
  const title = `${initial ? 'Edit' : 'Add'} ${isCardKind ? 'credit card' : 'installment app'}`;
  const sub = isCardKind ? 'Add the card once. Every purchase and payment is tracked against it.' : 'Add the app once, then add each purchase as an installment plan under it.';

  return <ModalShell title={title} subtitle={sub} onClose={onClose} wide>
    <WizardProgress step={step} total={total} labels={labels} />
    <form onSubmit={submit}>
      {isCardKind && step === 1 && <section className="tx-wizard-page">
        <div className="tx-wizard-intro"><h3>About your card</h3><p>Name it, set the limit, and choose which account pays the bill.</p></div>{preview}
        <div className="form-grid">
          <Field label="Card name" wide><input autoFocus required maxLength={60} value={f.name} onChange={e => set('name', e.target.value)} placeholder="e.g. CIB Platinum" /></Field>
          <Field label={`Credit limit (${currency})`}><input required type="number" inputMode="decimal" min="1" step="0.01" value={f.limit} onChange={e => set('limit', e.target.value)} placeholder="e.g. 20000" /></Field>
          <Field label="Pay the bill from"><select required value={f.pay_from} onChange={e => set('pay_from', e.target.value)}><option value="">Choose account</option>{moneyAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label={`Already owed on this card (${currency})`}><input type="number" inputMode="decimal" min="0" step="0.01" value={f.owed} onChange={e => set('owed', e.target.value)} placeholder="0" /><small className="field-hint">What you owe today. Leave empty if the card is clear.</small></Field>
          {Number(f.owed) > 0 && <Field label="Owed as of"><input type="date" value={f.owed_date} onChange={e => set('owed_date', e.target.value)} /></Field>}
          <Field label="Accent color" wide><div className="choice-color-row">{COLORS.map(([v, l]) => <button type="button" key={v} title={l} aria-label={l} className={`color-choice ${f.color === v ? 'selected' : ''}`} style={{ '--choice-color': v }} onClick={() => set('color', v)}><span /></button>)}</div></Field>
        </div>
        <div className="tx-wizard-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => setStep(2)}>Continue <ArrowUpRight size={16} /></button></div>
      </section>}

      {isCardKind && step === 2 && <section className="tx-wizard-page">
        <div className="tx-wizard-intro"><h3>When do you pay?</h3><p>Your bank closes a statement every month, then gives you some days to pay it.</p></div>
        <div className="form-grid">
          <Field label="Statement day of the month"><input autoFocus required type="number" inputMode="numeric" min="1" max="28" step="1" value={f.statement_day} onChange={e => set('statement_day', e.target.value)} placeholder="e.g. 5" /><small className="field-hint">Day 1 to 28. Find it on your bank statement.</small></Field>
          <Field label="Days to pay after the statement"><input required type="number" inputMode="numeric" min="0" max="90" step="1" value={f.grace_days} onChange={e => set('grace_days', e.target.value)} /><small className="field-hint">Usually 20 to 25 days.</small></Field>
        </div>
        <div className="cc-example" aria-live="polite">{exampleHTML ? <>
          <b>How Pocket works out the due date</b><br />
          Buy on {shortDate(exampleHTML.after)} → statement {shortDate(exampleHTML.a.statement)} → pay by <b>{shortDate(exampleHTML.a.due)}</b> ({exampleHTML.a.days} days).<br />
          Buy on {shortDate(exampleHTML.on)} → pay by <b>{shortDate(exampleHTML.b.due)}</b> ({exampleHTML.b.days} days).<br />
          The longest time to pay is the day after your statement.</> : 'Enter your statement day to see an example.'}</div>
        <div className="tx-wizard-actions"><button type="button" className="btn btn-secondary" onClick={() => setStep(1)}><ChevronLeft size={16} /> Back</button><button type="button" className="btn btn-primary" onClick={() => setStep(3)}>Review <ArrowUpRight size={16} /></button></div>
      </section>}

      {!isCardKind && step === 1 && <section className="tx-wizard-page">
        <div className="tx-wizard-intro"><h3>Which app?</h3><p>Pick the app that gives you the installment limit. Your card takes that app's look.</p></div>{preview}
        <div className="cc-provider-grid" role="group" aria-label="Installment app">{[...PROVIDER_PRESETS, 'Other'].map(p => <button type="button" key={p} className={`cc-provider-btn ${f.preset === p ? 'on' : ''}`} onClick={() => pickPreset(p)} aria-pressed={f.preset === p}><i className="cc-provider-dot" style={{ background: `linear-gradient(135deg,${PROVIDER_THEMES[p]?.a || '#9aa3b2'},${PROVIDER_THEMES[p]?.b || '#4b5563'})` }} />{p}</button>)}</div>
        <div className="form-grid" style={{ marginTop: 16 }}>
          {f.preset === 'Other' && <><Field label="App name" wide><input required autoFocus maxLength={60} value={f.name} onChange={e => set('name', e.target.value)} placeholder="Enter the app name" /></Field><Field label="Card color" wide><div className="choice-color-row">{COLORS.map(([v, l]) => <button type="button" key={v} title={l} aria-label={l} className={`color-choice ${f.color === v ? 'selected' : ''}`} style={{ '--choice-color': v }} onClick={() => set('color', v)}><span /></button>)}</div></Field></>}
          <Field label={`Credit limit (${currency})`}><input required type="number" inputMode="decimal" min="1" step="0.01" value={f.limit} onChange={e => set('limit', e.target.value)} placeholder="e.g. 30000" /><small className="field-hint">The most you can have in installments at once.</small></Field>
          <Field label="Pay installments from"><select required value={f.pay_from} onChange={e => set('pay_from', e.target.value)}><option value="">Choose account</option>{moneyAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        </div>
        <div className="tx-wizard-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={!f.preset} onClick={() => setStep(2)}>Review <ArrowUpRight size={16} /></button></div>
      </section>}

      {step === reviewStep && <section className="tx-wizard-page">
        <div className="tx-wizard-intro"><h3>Review</h3><p>Check the details before saving.</p></div>
        <div className="tx-review-card"><div className="tx-review-icon"><Icon size={22} /></div><div className="tx-review-main"><span>{typeLabel.toUpperCase()}</span><strong>{name || typeLabel}</strong><small>{isCardKind ? `Statement on the ${f.statement_day}th · ${f.grace_days} days to pay` : 'Add purchases as installment plans'}</small></div><strong className="tx-review-amount">{fmt(Number(f.limit) || 0)}</strong></div>
        <div className="tx-review-details">
          <div><span>Credit limit</span><b>{fmt(Number(f.limit) || 0)}</b></div>
          <div><span>Paid from</span><b>{payFromName}</b></div>
          {isCardKind && <><div><span>Statement closes</span><b>Day {f.statement_day} of every month</b></div><div><span>Time to pay</span><b>{f.grace_days} days after the statement</b></div><div><span>Already owed</span><b>{fmt(Number(f.owed) || 0)}</b></div></>}
        </div>
        <div className="tx-wizard-actions"><button type="button" className="btn btn-secondary" onClick={() => setStep(reviewStep - 1)}><ChevronLeft size={16} /> Back</button><button type="submit" className="btn btn-primary" disabled={!name || !Number(f.limit) || !f.pay_from || (isCardKind && !f.statement_day)}><Check size={16} />{initial ? 'Save changes' : isCardKind ? 'Add card' : 'Add app'}</button></div>
      </section>}
    </form>
  </ModalShell>;
}
