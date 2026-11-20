import { useState } from 'react';
import { isGoalsAccount } from '../../lib/features.js';
import { localISODate } from '../../lib/format.js';

export function DebtPaymentChoiceModal({debt,accounts=[],currency='EGP',onClose,onSubmit}){
 const due=Math.min(Number(debt.monthly_payment||0),Number(debt.remaining_amount||0));
 const [amount,setAmount]=useState(String(due));const [accountId,setAccountId]=useState(debt.account_id||accounts.find(a=>!isGoalsAccount(a))?.id||'');const [date,setDate]=useState(localISODate());const [busy,setBusy]=useState(false);
 const fmt=n=>new Intl.NumberFormat('en-EG',{style:'currency',currency,maximumFractionDigits:2}).format(Number(n)||0);
 const entered=Number(amount||0);const fees=Math.max(0,entered-due);const partial=entered>0&&entered<due;
 async function submit(){if(Number(amount)<=0||!accountId)return;setBusy(true);try{await onSubmit({mode:'transaction',amount:Number(amount),accountId,paymentDate:date})}finally{setBusy(false)}}
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal debt-pay" role="dialog" aria-modal="true" aria-labelledby="debt-payment-title">
  <div className="debt-pay-head"><div><span className="debt-pay-eyebrow">Debt repayment</span><h2 id="debt-payment-title">Confirm installment payment</h2><p>{debt.name} · due installment <b>{fmt(due)}</b></p></div><button type="button" className="debt-pay-close" onClick={onClose} aria-label="Close">×</button></div>
  <div className="debt-pay-body">
   <label className="debt-pay-field"><span>Amount paid</span><input type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/><small>Due installment {fmt(due)} · {partial?`Partial payment, ${fmt(due-entered)} still due`:`Extra fees ${fmt(fees)}`}</small></label>
   <div className="debt-pay-row">
    <label className="debt-pay-field"><span>Paid from account</span><select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Choose account</option>{accounts.filter(a=>!isGoalsAccount(a)).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label className="debt-pay-field"><span>Payment date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
   </div>
   <div className="debt-pay-summary"><div><span>Expense transaction</span><b>{fmt(amount)}</b></div><p>{partial?`The debt balance decreases by ${fmt(entered)} (the amount you paid). The installment stays open for the rest.`:`The installment balance decreases by ${fmt(due)}.`} {partial?'':fees>0?`${fmt(fees)} will be recorded as extra fees.`:'No extra fees added.'}</p></div>
  </div>
  <div className="debt-pay-actions"><button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="button" disabled={busy||!(Number(amount)>0)||!accountId} onClick={submit}>{busy?'Saving…':'Confirm payment'}</button></div>
 </section></div>
}
