import { AnimatedNumber } from '../../components/ui/AnimatedNumber.jsx';
import { ArrowLeft, Check, Pencil, Plus, Trash2, Wallet } from '../../lib/icons.jsx';
import { useState } from 'react';
import { cardCycle, money } from '../../lib/credit.js';
import { shortDate } from '../../lib/format.js';
import { CardVisual, DueChip, LimitBar } from './CreditSummary.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

// Credit card page: what to pay next up top, then tabs for what you owe, what you paid, and card info.
export function CardDetail({ card, summary, accounts = [], currency, onBack, onPay, onAddPurchase, onConvert, onPayPlan, onEditPlan, onDeletePlan, onEdit, onDelete, renderReport }) {
  const fmt = money(currency);
  const [tab, setTab] = useState('pay');
  const next = summary.next;
  const nameOf = id => accounts.find(a => String(a.id) === String(id))?.name || 'Account';
  const payFrom = nameOf(card.pay_from_account_id);

  // "Best day to buy" is the day after the statement closes.
  const tip = (() => {
    const day = Number(card.statement_day); if (!day) return null;
    const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
    const iso = d => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
    return { best: cardCycle(iso(day + 1), card).days, worst: cardCycle(iso(day), card).days };
  })();

  return <>
    <button className="cc-back" onClick={onBack}><ArrowLeft size={15} /> Debts &amp; installments</button>
    <div className="page-heading"><div><div className="eyebrow">CREDIT CARD</div><h1>{card.name}</h1><p>{card.statement_day ? `Statement on the ${card.statement_day}th · pay within ${card.grace_days ?? 25} days · paid from ${payFrom}` : 'Finish setup to see accurate due dates'}</p></div><div className="heading-actions"><button className="btn btn-primary" onClick={() => onAddPurchase(card)}><Plus size={17} /> Add purchase</button></div></div>

    {summary.needsSetup && <div className="cc-banner" role="status"><span><b>Finish setting up this card</b>Add the limit and statement day so Pocket can work out your due dates.</span><button className="btn btn-secondary btn-sm" onClick={() => onEdit(card)}>Edit card</button></div>}

    <div className="cc-hero">
      <CardVisual account={card} line1={card.statement_day ? `Statement closes on the ${card.statement_day}th` : ''} line2={`Pay within ${card.grace_days ?? 25} days · from ${payFrom}`} />
      <section className="panel cc-next">
        <div>
          <div className="cc-row-between"><span className="cc-label">Next payment</span>{next ? <DueChip date={next.due} /> : <span className="cc-chip ok">All paid</span>}</div>
          {next ? <><div className="cc-amount"><AnimatedNumber value={fmt(next.remaining)} /></div><div className="cc-sub">Due {shortDate(next.due)}</div></> : <><div className="cc-amount ok">All clear</div><div className="cc-sub">Nothing to pay right now.</div></>}
        </div>
        {next && <div className="cc-actions"><button className="btn btn-primary" onClick={() => onPay(card, 0)}>Pay {fmt(next.remaining)}</button>{summary.groups.length > 1 && <button className="btn btn-secondary" onClick={() => onPay(card, summary.groups.length - 1)}>Pay all {fmt(summary.owed)}</button>}<button className="btn btn-secondary" onClick={() => onPay(card, 'custom')}>Other amount</button></div>}
      </section>
    </div>
    <section className="panel" style={{ padding: '16px 20px' }}><LimitBar used={summary.owed} limit={summary.limit} currency={currency} /></section>

    <div className="cc-tabs" role="tablist" aria-label="Card sections">
      {[['pay', `To pay${summary.groups.length ? ` (${summary.groups.length})` : ''}`], ['paid', `Payments${summary.payments.length ? ` (${summary.payments.length})` : ''}`], ['about', 'About this card']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`cc-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
    </div>

    {summary.activePlans.length > 0 && <section className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
      <div className="cc-line" style={{ borderTop: 0 }}><span><b>Installment plans on this card</b><small>Not part of the statement. Pay them month by month.</small></span><span><b>{fmt(summary.planOwed)}</b></span></div>
      {summary.activePlans.map(d => <div className="cc-line" key={d.id}><span>{d.name}<small>{d.due_date ? `Next ${shortDate(d.due_date)} · ` : ''}{fmt(Math.min(Number(d.monthly_payment || 0), Number(d.remaining_amount || 0)))} / month · {fmt(d.remaining_amount)} left</small></span><span className="row-actions"><button className="btn btn-secondary btn-sm" onClick={() => onPayPlan(d)}>Record payment</button>{renderReport && renderReport(d)}<button className="icon-btn" title="Edit plan" aria-label={`Edit ${d.name}`} onClick={() => onEditPlan(d)}><Pencil size={15} /></button><button className="icon-btn danger-hover" title="Delete plan" aria-label={`Delete ${d.name}`} onClick={() => onDeletePlan(d)}><Trash2 size={15} /></button></span></div>)}
    </section>}

    {tab === 'pay' && (summary.groups.length ? <>
      <p className="small-muted" style={{ margin: '0 0 12px' }}>Each group is one due date. Pay the top one first to avoid interest.</p>
      {summary.groups.map((g, i) => <details className="cc-group" key={g.due} open={i === 0}>
        <summary><span><b>Pay by {shortDate(g.due)}</b><br /><small className="cc-sub">{g.items.filter(x => x.remaining > 0).length} purchase{g.items.filter(x => x.remaining > 0).length === 1 ? '' : 's'}{g.statement ? ` · statement ${shortDate(g.statement)}` : ''}</small></span><span className="cc-group-end"><b>{fmt(g.remaining)}</b><DueChip date={g.due} /></span></summary>
        {g.items.filter(x => x.remaining > 0).map(c => <div className="cc-line" key={c.id}><span>{c.description}<small>{shortDate(c.date)}</small></span><span style={{ display: "flex", alignItems: "center" }}>{fmt(c.remaining)}{c.remaining < c.amount - 0.004 && <small>of {fmt(c.amount)}</small>}{onConvert && c.tx && c.tx.type === 'Expense' && c.remaining >= c.amount - 0.004 && <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 12 }} onClick={() => onConvert(card, c.tx)}>Make installments</button>}</span></div>)}
      </details>)}
    </> : <EmptyState panel icon={Check} title="Nothing to pay" text="New purchases on this card show up here, grouped by due date."><button className="btn btn-primary" onClick={() => onAddPurchase(card)}><Plus size={16} /> Add purchase</button></EmptyState>)}

    {tab === 'paid' && (summary.payments.length ? <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>{summary.payments.map(p => <div className="cc-line" key={p.id} style={{ borderTop: 0, borderBottom: '1px solid var(--line)' }}><span>{p.from === 'Refund' ? 'Refund' : `${nameOf(p.from)} → ${card.name}`}<small>{shortDate(p.date)}</small></span><span className="amount-income">{fmt(p.amount)}</span></div>)}</div>
      : <EmptyState panel icon={Wallet} title="No payments yet" text="When you pay the card, you will see how much and from which account."/>)}

    {tab === 'about' && <>
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>{[['Credit limit', fmt(summary.limit)], ['Statement closes', card.statement_day ? `Day ${card.statement_day} of every month` : 'Not set'], ['Time to pay', `${card.grace_days ?? 25} days after the statement`], ['Paid from', payFrom]].map(([l, v]) => <div className="cc-line" key={l}><span>{l}</span><span>{v}</span></div>)}</div>
      {tip && <div className="cc-tip"><b>Best day to buy: the {Number(card.statement_day) + 1}th.</b> A purchase that day gets about {tip.best} days to pay. One made on the {card.statement_day}th gets about {tip.worst}.</div>}
      <div className="cc-actions" style={{ marginTop: 16 }}><button className="btn btn-secondary" onClick={() => onEdit(card)}><Pencil size={15} /> Edit card</button><button className="btn btn-secondary" onClick={() => onDelete(card)}><Trash2 size={15} /> Delete card</button></div>
    </>}
  </>;
}
