import { useState } from 'react';
import { Check, HandCoins, Plus, Trash2 } from '../../lib/icons.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { isGoalsAccount } from '../../lib/features.js';
import { localISODate, shortDate } from '../../lib/format.js';

export function loanStatus(loan,transactions=[]){
 const back=transactions.filter(t=>String(t.loan_given_id)===String(loan.id)&&t.type==='Income').reduce((s,t)=>s+Number(t.amount||0),0);
 const amount=Number(loan.amount||0);const left=Math.max(0,amount-back);
 return {back,left,amount,done:!!loan.closed_at||left<=0,progress:amount>0?Math.min(100,back/amount*100):0};
}

function LoanModal({mode,loan,accounts,currency,onClose,onSubmit}){
 const lend=mode==='lend';const st=loan?loanStatus(loan,loan._tx):null;
 const usable=accounts.filter(a=>!isGoalsAccount(a));
 const [person,setPerson]=useState('');const [amount,setAmount]=useState(lend?'':String(st?.left||''));
 const [accountId,setAccountId]=useState(loan?.account_id||usable[0]?.id||'');const [date,setDate]=useState(localISODate());const [note,setNote]=useState('');const [busy,setBusy]=useState(false);
 const fmt=n=>new Intl.NumberFormat('en-EG',{style:'currency',currency,maximumFractionDigits:2}).format(Number(n)||0);
 const n=Number(amount||0);const ok=n>0&&accountId&&(lend?person.trim():n<=st.left+0.001);
 async function submit(){if(!ok)return;setBusy(true);try{await onSubmit({person:person.trim(),amount:n,accountId,date,note:note.trim()})}finally{setBusy(false)}}
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal debt-pay" role="dialog" aria-modal="true" aria-labelledby="loan-modal-title">
  <div className="debt-pay-head"><div><span className="debt-pay-eyebrow">Owed to me</span><h2 id="loan-modal-title">{lend?'Lend money':`Money back from ${loan.person}`}</h2><p>{lend?'Your account goes down. It is not counted as spending.':`${fmt(st.left)} still owed. It is not counted as income.`}</p></div><button type="button" className="debt-pay-close" onClick={onClose} aria-label="Close">×</button></div>
  <div className="debt-pay-body">
   {lend&&<label className="debt-pay-field"><span>Who did you lend to?</span><input value={person} onChange={e=>setPerson(e.target.value)} placeholder="Ahmed" autoFocus/></label>}
   <label className="debt-pay-field"><span>{lend?'Amount lent':'Amount back'}</span><input type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} autoFocus={!lend}/>{!lend&&n>st.left+0.001&&<small>That is more than the {fmt(st.left)} still owed.</small>}</label>
   <div className="debt-pay-row">
    <label className="debt-pay-field"><span>{lend?'From account':'Into account'}</span><select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Choose account</option>{usable.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label className="debt-pay-field"><span>Date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
   </div>
   {lend&&<label className="debt-pay-field"><span>Note (optional)</span><input value={note} onChange={e=>setNote(e.target.value)}/></label>}
  </div>
  <div className="debt-pay-actions"><button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="button" disabled={busy||!ok} onClick={submit}>{busy?'Saving…':lend?'Save loan':'Record money back'}</button></div>
 </section></div>;
}

export function OwedToMe({loans=[],accounts=[],transactions=[],currency='EGP',onLend,onBack,onClose,onReopen,onDelete,requestConfirm}){
 const [modal,setModal]=useState(null);
 const fmt=n=>new Intl.NumberFormat('en-EG',{style:'currency',currency,maximumFractionDigits:0}).format(Number(n)||0);
 const rows=loans.map(l=>({...l,_tx:transactions,st:loanStatus(l,transactions)}));
 const open=rows.filter(r=>!r.st.done),done=rows.filter(r=>r.st.done);
 const owed=open.reduce((s,r)=>s+r.st.left,0);
 const acc=id=>accounts.find(a=>String(a.id)===String(id))?.name||'Account';
 return <>
  <div className="cc-section-head"><div><h2>Owed to me</h2><p>{open.length?`${fmt(owed)} from ${open.length} ${open.length===1?'person':'people'} · not in your income or spending`:'Money you lent. Not counted as spending, and not income when it comes back.'}</p></div><button className="btn btn-primary btn-sm" onClick={()=>setModal({mode:'lend'})}><Plus size={14}/> Lend money</button></div>
  {open.length?<div className="lent-list">{open.map(r=><section className="panel lent-card" key={r.id}>
   <div className="lent-top"><span className="lent-avatar">{(r.person||'?').trim().charAt(0).toUpperCase()}</span><div className="lent-title"><h3>{r.person}</h3><p>{r.st.back>0?`${fmt(r.st.amount)} lent · ${fmt(r.st.back)} back`:`Lent ${shortDate(r.lent_on)} from ${acc(r.account_id)}`}</p></div><b className="lent-left">{fmt(r.st.left)}</b></div>
   {r.st.back>0&&<div className="progress-track"><span style={{width:`${r.st.progress}%`,background:'var(--ds-ok,#187d55)'}}/></div>}
   <div className="lent-actions"><button className="btn btn-secondary" onClick={()=>setModal({mode:'back',loan:r})}>Part back</button><button className="btn btn-primary" onClick={()=>onBack(r,{amount:r.st.left,accountId:r.account_id,date:localISODate()})}><Check size={15}/> Got it all back</button><button className="icon-btn danger-hover" title="Delete" aria-label={`Delete loan to ${r.person}`} onClick={()=>requestConfirm('Delete this loan?',`Delete the loan to ${r.person} and its money-back entries? Your account balances go back to before it.`,()=>onDelete(r),'Delete')}><Trash2 size={15}/></button></div>
  </section>)}</div>:(!done.length&&<EmptyState panel icon={HandCoins} title="Nobody owes you money" text="Lent money to a friend? Add it here. Your account goes down now, and back up as they pay you, without touching your income or spending."><button className="btn btn-primary" onClick={()=>setModal({mode:'lend'})}><Plus size={16}/> Lend money</button></EmptyState>)}
  {done.length>0&&<details className="debt-done"><summary><Check size={15}/> Paid back ({done.length})</summary><div className="debt-done-list">{done.map(r=><div className="debt-done-row" key={r.id}><div><b>{r.person}</b><small>{fmt(r.st.amount)} lent · {fmt(r.st.back)} back</small></div><div className="row-actions">{r.closed_at&&r.st.left>0&&<button className="select-lite" onClick={()=>onReopen(r)}>Reopen</button>}<button className="icon-btn danger-hover" title="Delete" aria-label={`Delete loan to ${r.person}`} onClick={()=>requestConfirm('Delete this loan?',`Delete the loan to ${r.person} and its money-back entries?`,()=>onDelete(r),'Delete')}><Trash2 size={15}/></button></div></div>)}</div></details>}
  {modal&&<LoanModal mode={modal.mode} loan={modal.loan} accounts={accounts} currency={currency} onClose={()=>setModal(null)} onSubmit={async v=>{const ok=modal.mode==='lend'?await onLend(v):await onBack(modal.loan,v);if(ok)setModal(null);}}/>}
 </>;
}
