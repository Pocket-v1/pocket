import { AnimatedNumber } from '../../components/ui/AnimatedNumber.jsx';
import { ArrowLeft, Check, Pencil, Plus, Trash2 } from '../../lib/icons.jsx';
import { useState } from 'react';
import { money } from '../../lib/credit.js';
import { shortDate } from '../../lib/format.js';
import { CardVisual, DueChip, LimitBar } from './CreditSummary.jsx';
import { ShoppingBag } from '../../lib/icons.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

// Installment app page (Valu, Aman, Halan...): limit, what is due next, and every plan under the app.
export function ProviderDetail({ provider, summary, accounts = [], currency, onBack, onPay, onPayPlan, onAddPlan, onConvert, onEdit, onDelete, onEditPlan, onDeletePlan, renderReport }) {
  const fmt = money(currency);
  const [tab, setTab] = useState('active');
  const next = summary.next;
  const payFrom = accounts.find(a => String(a.id) === String(provider.pay_from_account_id))?.name || 'Not set';
  const sorted = [...summary.active].sort((a, b) => String(a.due_date || '9').localeCompare(String(b.due_date || '9')));

  return <>
    <button className="cc-back" onClick={onBack}><ArrowLeft size={15} /> Debts &amp; installments</button>
    <div className="page-heading"><div><div className="eyebrow">INSTALLMENT APP</div><h1>{provider.name}</h1><p>{summary.active.length} active plan{summary.active.length === 1 ? '' : 's'} · paid from {payFrom}</p></div><div className="heading-actions"><button className="btn btn-primary" onClick={() => onAddPlan(provider)}><Plus size={17} /> Add purchase plan</button></div></div>

    <div className="cc-hero">
      <CardVisual account={provider} icon={ShoppingBag} kindLabel="Installment app" line1={`Limit ${fmt(summary.limit)}`} line2={summary.monthly > 0 ? `${fmt(summary.monthly)} due every month` : ''} />
      <section className="panel cc-next">
        <div>
          <div className="cc-row-between"><span className="cc-label">Next payment</span>{next ? <DueChip date={next.due} /> : <span className="cc-chip ok">{summary.active.length ? 'Not scheduled' : 'No active plans'}</span>}</div>
          {next ? <><div className="cc-amount"><AnimatedNumber value={fmt(next.amount)} /></div><div className="cc-sub">Due {shortDate(next.due)} · {next.plans.length} plan{next.plans.length === 1 ? '' : 's'}</div></> : <><div className="cc-amount ok">All clear</div><div className="cc-sub">Nothing to pay right now.</div></>}
        </div>
        {next && <div className="cc-actions"><button className="btn btn-primary" onClick={() => onPay(provider, next)}>Pay {fmt(next.amount)}</button></div>}
      </section>
    </div>
    {summary.looseOwed > 0.004 && <section className="panel cc-plan"><div className="cc-plan-top"><div><h3>Purchases without a plan</h3><p>Bought with {provider.name} from Add transaction. They count as an expense when you pay, or turn one into installments.</p></div></div><div className="cc-plan-nums"><div><span>To pay</span><b>{fmt(summary.looseOwed)}</b></div></div>
      <div className="tx-review-details" style={{ margin: '10px 0' }}>{summary.loosePurchases.map(t => <div key={t.id}><span>{t.description || t.category || 'Purchase'} · {shortDate(t.transaction_date)}</span><b>{fmt(t.amount)} {onConvert && <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }} onClick={() => onConvert(provider, t)}>Make installments</button>}</b></div>)}</div>
      <div className="cc-row-between"><span className="cc-sub">&nbsp;</span><button className="btn btn-primary btn-sm" onClick={() => onPay(provider, { due: '', plans: [{ id: 'loose', name: 'Purchases on ' + provider.name }], amount: summary.looseOwed, looseAmount: summary.looseOwed })}>Pay {fmt(summary.looseOwed)}</button></div></section>}
    <section className="panel" style={{ padding: '16px 20px' }}><LimitBar used={summary.used} limit={summary.limit} usedLabel="committed" currency={currency} /></section>

    <div className="cc-tabs" role="tablist" aria-label="Installment app sections">
      {[['active', `Active plans${summary.active.length ? ` (${summary.active.length})` : ''}`], ['done', `Completed${summary.done.length ? ` (${summary.done.length})` : ''}`], ['about', 'About this app']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`cc-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
    </div>

    {tab === 'active' && (sorted.length ? sorted.map(d => {
      const term = Number(d.term_months || 0), paid = Number(d.paid_installments || 0), total = Number(d.total_repayment || d.original_amount || 0), done = Number(d.amount_paid || 0), pct = total > 0 ? Math.min(100, done / total * 100) : 0;
      return <section className="panel cc-plan" key={d.id}>
        <div className="cc-plan-top"><div><h3>{d.name}</h3><p>{d.due_date ? `Next installment ${shortDate(d.due_date)}` : 'No due date set'}</p></div><div className="row-actions"><DueChip date={d.due_date} />{renderReport && renderReport(d)}<button className="icon-btn" title="Edit plan" aria-label={`Edit ${d.name}`} onClick={() => onEditPlan(d)}><Pencil size={15} /></button><button className="icon-btn danger-hover" title="Delete plan" aria-label={`Delete ${d.name}`} onClick={() => onDeletePlan(d)}><Trash2 size={15} /></button></div></div>
        <div className="cc-plan-nums"><div><span>Installment</span><b>{fmt(Math.min(Number(d.monthly_payment || 0), Number(d.remaining_amount || 0)))}</b></div><div><span>Remaining</span><b>{fmt(d.remaining_amount)}</b></div><div><span>Paid</span><b>{paid}{term ? ` of ${term}` : ''}</b></div></div>
        <div className="cc-bar" aria-hidden="true"><i style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--green)' : undefined }} /></div>
        <div className="cc-row-between"><span className="cc-sub">{Math.round(pct)}% repaid</span><button className="btn btn-secondary btn-sm" onClick={() => onPayPlan(d)}>Record this payment</button></div>
      </section>;
    }) : <div className="panel cc-empty"><b>No active plans</b><p>Add what you bought on {provider.name} to track the installments and the limit left.</p><button className="btn btn-primary" onClick={() => onAddPlan(provider)}><Plus size={16} /> Add purchase plan</button></div>)}

    {tab === 'done' && (summary.done.length ? <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>{summary.done.map(d => <div className="cc-line" key={d.id}><span>{d.name}<small>{d.term_months ? `${d.term_months} installments` : 'Plan'}</small></span><span><span className="cc-chip ok">Fully paid</span></span></div>)}</div> : <EmptyState panel icon={Check} title="Nothing completed yet" text="Plans move here once every installment is paid."/>)}

    {tab === 'about' && <>
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>{[['Credit limit', fmt(summary.limit)], ['Committed', fmt(summary.used)], ['Available', fmt(summary.available)], ['Paid from', payFrom], ['Every month', fmt(summary.monthly)]].map(([l, v]) => <div className="cc-line" key={l}><span>{l}</span><span>{v}</span></div>)}</div>
      <div className="cc-tip">Your limit goes down by what you still owe on each plan, and comes back as you pay.</div>
      <div className="cc-actions" style={{ marginTop: 16 }}><button className="btn btn-secondary" onClick={() => onEdit(provider)}><Pencil size={15} /> Edit app</button><button className="btn btn-secondary" onClick={() => onDelete(provider)}><Trash2 size={15} /> Delete app</button></div>
    </>}
  </>;
}
