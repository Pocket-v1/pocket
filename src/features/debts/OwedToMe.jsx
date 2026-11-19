import { useState } from 'react';
import { Check, ChevronDown, HandCoins, Trash2 } from '../../lib/icons.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { isGoalsAccount } from '../../lib/features.js';
import { localISODate, shortDate } from '../../lib/format.js';
import { accountFlows } from '../../lib/credit.js';

export function loanStatus(loan,transactions=[]){
 const back=transactions.filter(t=>String(t.loan_given_id)===String(loan.id)&&t.type==='Income').reduce((s,t)=>s+Number(t.amount||0),0);
 const amount=Number(loan.amount||0);const left=Math.max(0,amount-back);
 return {back,left,amount,done:!!loan.closed_at||left<=0,progress:amount>0?Math.min(100,back/amount*100):0};
}
const dayDiff=d=>Math.round((new Date(`${d}T00:00:00`)-new Date(`${localISODate()}T00:00:00`))/864e5);
export function dueLabel(due){if(!due)return null;const n=dayDiff(due);return n<0?{text:`${-n} day${n===-1?'':'s'} late`,late:true}:n===0?{text:'Due today',late:true}:{text:`Due in ${n} day${n===1?'':'s'}`,late:n<=3};}

function LoanModal({mode,loan,loans=[],accounts,transactions=[],currency,onClose,onSubmit,friends=[],presetFriend=null}){
 const lend=mode==='lend',pay=mode==='pay';const st=loan?(pay?{left:Math.max(0,Number(loan.amount)-Number(loan.back||0))}:loanStatus(loan,transactions)):null;
 const [friendId,setFriendId]=useState(presetFriend?.friend_id||'');
 const usable=accounts.filter(a=>!isGoalsAccount(a));
 const [person,setPerson]=useState(presetFriend?.name||'');const [amount,setAmount]=useState(lend?'':String(st?.left||''));
 const [accountId,setAccountId]=useState(loan?.account_id||usable[0]?.id||'');const [date,setDate]=useState(localISODate());const [due,setDue]=useState('');const [note,setNote]=useState('');const [busy,setBusy]=useState(false);
 const fmt=n=>new Intl.NumberFormat('en-EG',{style:'currency',currency,maximumFractionDigits:2}).format(Number(n)||0);
 const names=[...new Set(loans.map(l=>String(l.person||'').trim()).filter(Boolean))];
 const existing=lend&&person.trim()?loans.find(l=>String(l.person).trim().toLowerCase()===person.trim().toLowerCase()&&!loanStatus(l,transactions).done):null;
 const acc=usable.find(a=>String(a.id)===String(accountId));const balance=acc?accountFlows(acc,transactions).balance:0;
 const n=Number(amount||0);const tooMuch=(lend||pay)&&acc&&n>balance+0.001;const extra=!lend&&!pay&&n>st.left+0.001?n-st.left:0;
 const ok=n>0&&accountId&&!tooMuch&&(lend?person.trim():pay?n<=st.left+0.001:true);
 async function submit(){if(!ok)return;setBusy(true);try{await onSubmit({person:person.trim(),friendId:friendId||null,amount:n,accountId,date,due:due||null,note:note.trim()})}finally{setBusy(false)}}
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal debt-pay" role="dialog" aria-modal="true" aria-labelledby="loan-modal-title">
  <div className="debt-pay-head"><div><span className="debt-pay-eyebrow">Owed to me</span><h2 id="loan-modal-title">{lend?'Lend money':pay?`Pay back ${loan.lender_name}`:`Money back from ${loan.person}`}</h2><p>{lend?'Your account goes down now and back up when they pay you.':pay?`You owe ${fmt(st.left)}. ${loan.lender_name} confirms it.`:`${fmt(st.left)} still owed.`}</p></div><button type="button" className="debt-pay-close" onClick={onClose} aria-label="Close">×</button></div>
  <div className="debt-pay-body">
   {lend&&friends.length>0&&<label className="debt-pay-field"><span>Pocket friend (optional)</span><select value={friendId} onChange={e=>{const f=friends.find(x=>String(x.friend_id)===e.target.value);setFriendId(e.target.value);if(f)setPerson(f.name);}}><option value="">Not a Pocket friend</option>{friends.map(f=><option key={f.friend_id} value={f.friend_id}>{f.name}</option>)}</select>{friendId&&<small>They get a request to confirm. Once they do, it shows in their Pocket too.</small>}</label>}
   {lend&&<label className="debt-pay-field"><span>Who did you lend to?</span><input value={person} onChange={e=>setPerson(e.target.value)} list="lent-people" placeholder="Name" autoFocus/>{names.length>0&&<datalist id="lent-people">{names.map(x=><option key={x} value={x}/>)}</datalist>}{existing&&<small>{existing.person} already owes you {fmt(loanStatus(existing,transactions).left)}. This adds a new loan.</small>}</label>}
   <label className="debt-pay-field"><span>{lend?'Amount lent':pay?'Amount paid':'Amount back'}</span><input type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} autoFocus={!lend}/>{pay&&n>st.left+0.001?<small className="lent-warn">That is more than the {fmt(st.left)} you owe.</small>:tooMuch?<small className="lent-warn">{acc.name} only has {fmt(balance)}.</small>:extra>0?<small>{fmt(st.left)} closes the loan. The extra {fmt(extra)} is saved as income.</small>:null}</label>
   <div className="debt-pay-row">
    <label className="debt-pay-field"><span>{lend||pay?'From account':'Into account'}</span><select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Choose account</option>{usable.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>{(lend||pay)&&acc&&<small>Balance {fmt(balance)}</small>}</label>
    <label className="debt-pay-field"><span>Date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
   </div>
   {lend&&<div className="debt-pay-row">
    <label className="debt-pay-field"><span>Expected back (optional)</span><input type="date" min={date} value={due} onChange={e=>setDue(e.target.value)}/><small>We remind you when it is due.</small></label>
    <label className="debt-pay-field"><span>Note (optional)</span><input value={note} onChange={e=>setNote(e.target.value)}/></label>
   </div>}
   <div className="debt-pay-summary"><div><span>Counted in income or spending</span><b>No</b></div><p>{lend?'Only your account balance changes. It shows in Transactions as “Not counted”.':'Only your account balance changes.'}</p></div>
  </div>
  <div className="debt-pay-actions"><button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="button" disabled={busy||!ok} onClick={submit}>{busy?'Saving…':lend?(friendId?'Save and send':'Save loan'):pay?'Send for confirmation':'Record money back'}</button></div>
 </section></div>;
}

function AccountConfirm({accounts,defaultId,label,onYes,onNo,noLabel='Not right'}){
 const usable=accounts.filter(a=>!isGoalsAccount(a));const [id,setId]=useState(defaultId||usable[0]?.id||'');const [busy,setBusy]=useState(false);
 const run=async fn=>{setBusy(true);try{await fn()}finally{setBusy(false)}};
 return <div className="lent-confirm"><select aria-label={label} value={id} onChange={e=>setId(e.target.value)}>{usable.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>run(onNo)}>{noLabel}</button><button className="btn btn-primary btn-sm" disabled={busy||!id} onClick={()=>run(()=>onYes(id))}><Check size={14}/> Confirm</button></div>;
}

export function OwedToMe({loans=[],accounts=[],transactions=[],currency='EGP',onLend,onBack,onReopen,onDelete,requestConfirm,lendOpen=false,setLendOpen=()=>{},friends=[],payments=[],owe=[],presetFriend=null,onPaymentRespond,onOweRespond,onOwePay,onInvite}){
 const [modal,setModalRaw]=useState(null);const [openId,setOpenId]=useState(null);
 const shown=lendOpen?{mode:'lend'}:modal;
 const pend=r=>payments.filter(p=>String(p.loan_id)===String(r.id)&&p.status==='pending_lender');
 const oweOpen=owe.filter(l=>!l.closed_at&&(l.share_status==='pending'||Number(l.amount)-Number(l.back||0)>0.001));
 const ask=(title,fn)=>{const why=window.prompt(title,'');if(why!==null)fn(why.trim());};
 const setModal=m=>{if(m?.mode==='lend'){setLendOpen(true);return;}setLendOpen(false);setModalRaw(m);};
 const fmt=n=>new Intl.NumberFormat('en-EG',{style:'currency',currency,maximumFractionDigits:0}).format(Number(n)||0);
 const rows=loans.map(l=>({...l,st:loanStatus(l,transactions),due:dueLabel(l.due_on)}));
 const open=rows.filter(r=>!r.st.done).sort((a,b)=>String(a.due_on||'9999').localeCompare(String(b.due_on||'9999'))),done=rows.filter(r=>r.st.done);
 const owed=open.reduce((s,r)=>s+r.st.left,0);
 const acc=id=>accounts.find(a=>String(a.id)===String(id))?.name||'Account';
 const history=r=>transactions.filter(t=>String(t.loan_given_id)===String(r.id)).sort((a,b)=>String(a.transaction_date).localeCompare(String(b.transaction_date)));
 return <>
  <div className="cc-section-head"><div><h2>Owed to me</h2><p>{open.length?`${fmt(owed)} from ${open.length} ${open.length===1?'person':'people'} · not in your income or spending`:'Money you lent. Not counted as spending, and not income when it comes back.'}</p></div></div>
  {open.length?<div className="lent-list">{open.map(r=><section className="panel lent-card" key={r.id}>
   <div className="lent-top"><span className="lent-avatar">{(r.person||'?').trim().charAt(0).toUpperCase()}</span><div className="lent-title"><h3>{r.person}</h3><p>{r.st.back>0?`${fmt(r.st.amount)} lent · ${fmt(r.st.back)} back`:`Lent ${shortDate(r.lent_on)} from ${acc(r.account_id)}`}</p></div><div className="lent-amount"><b className="lent-left">{fmt(r.st.left)}</b>{r.due&&<span className={`status-tag ${r.due.late?'status-pending':''}`}>{r.due.text}</span>}</div></div>
   {r.st.back>0&&<div className="progress-track"><span style={{width:`${r.st.progress}%`,background:'var(--ds-ok,#187d55)'}}/></div>}
   {r.note&&<p className="lent-note">{r.note}</p>}
   {r.friend_id&&<p className={`lent-share ${r.share_status==='rejected'?'is-bad':''}`}>{r.share_status==='confirmed'?`Confirmed by ${r.person}`:r.share_status==='rejected'?`${r.person} says this is not right${r.share_note?`: “${r.share_note}”`:''}`:`Waiting for ${r.person} to confirm`}</p>}
   {pend(r).map(p=><div className="lent-pending" key={p.id}><span>{r.person} says they sent you <b>{fmt(p.amount)}</b> on {shortDate(p.paid_on)}. Which account did it go into?</span><AccountConfirm accounts={accounts} defaultId={r.account_id} label="Account it went into" onYes={id=>onPaymentRespond(p,r,true,id)} onNo={()=>onPaymentRespond(p,r,false)} noLabel="Didn't get it"/></div>)}
   <div className="lent-actions"><button className="btn btn-secondary" onClick={()=>setModal({mode:'back',loan:r})}>Part back</button><button className="btn btn-primary" onClick={()=>onBack(r,{amount:r.st.left,accountId:r.account_id,date:localISODate()})}><Check size={15}/> Got it all back</button><button className="icon-btn danger-hover" title="Delete" aria-label={`Delete loan to ${r.person}`} onClick={()=>requestConfirm('Delete this loan?',`Delete the loan to ${r.person} and its money-back entries? Your account balances go back to before it.`,()=>onDelete(r),'Delete')}><Trash2 size={15}/></button></div>
   <div className="lent-foot"><button type="button" className="lent-history-toggle" aria-expanded={openId===r.id} onClick={()=>setOpenId(openId===r.id?null:r.id)}>History <ChevronDown size={14}/></button>{!r.friend_id&&onInvite&&<button type="button" className="lent-history-toggle" onClick={()=>onInvite(r)}>Invite {r.person} to Pocket</button>}</div>
   {openId===r.id&&<ul className="lent-history">{history(r).map(t=><li key={t.id}><span>{t.type==='Expense'?'Lent':'Back'} · {shortDate(t.transaction_date)} · {acc(t.account_id)}</span><b className={t.type==='Income'?'is-in':''}>{t.type==='Income'?'+':'−'}{fmt(t.amount)}</b></li>)}</ul>}
  </section>)}</div>:(!done.length&&!oweOpen.length&&<EmptyState panel icon={HandCoins} title="Nobody owes you money" text="Lent money to a friend? Add it with Lend money. Your account goes down now, and back up as they pay you, without touching your income or spending."/>)}
  {oweOpen.length>0&&<><div className="cc-section-head"><div><h2>You owe friends</h2><p>Loans friends shared with you. Not counted as income or spending.</p></div></div><div className="lent-list">{oweOpen.map(l=>{const left=Math.max(0,Number(l.amount)-Number(l.back||0));const mine=payments.filter(p=>String(p.loan_id)===String(l.id));return <section className="panel lent-card" key={l.id}>
   <div className="lent-top"><span className="lent-avatar is-owe">{(l.lender_name||'?').charAt(0).toUpperCase()}</span><div className="lent-title"><h3>{l.lender_name}</h3><p>{Number(l.back)>0?`${fmt(l.amount)} borrowed · ${fmt(l.back)} paid`:`Lent you ${fmt(l.amount)} on ${shortDate(l.lent_on)}`}</p></div><div className="lent-amount"><b className="lent-left">{fmt(left)}</b>{dueLabel(l.due_on)&&<span className={`status-tag ${dueLabel(l.due_on).late?'status-pending':''}`}>{dueLabel(l.due_on).text}</span>}</div></div>
   {l.note&&<p className="lent-note">{l.note}</p>}
   {l.share_status==='pending'?<div className="lent-pending"><span>{l.lender_name} says they lent you <b>{fmt(l.amount)}</b>. Which account did it go into?</span><AccountConfirm accounts={accounts} label="Account it went into" onYes={id=>onOweRespond(l,true,id)} onNo={()=>ask('What is not right?',why=>onOweRespond(l,false,null,why))}/></div>:<>
    {mine.filter(p=>p.status==='pending_payer').map(p=><div className="lent-pending" key={p.id}><span>{l.lender_name} recorded that you paid <b>{fmt(p.amount)}</b> on {shortDate(p.paid_on)}. Which account did it come from?</span><AccountConfirm accounts={accounts} defaultId={l.borrower_account_id} label="Account it came from" onYes={id=>onPaymentRespond(p,l,true,id,true)} onNo={()=>onPaymentRespond(p,l,false,null,true)}/></div>)}
    {mine.filter(p=>p.status==='pending_lender').map(p=><p className="lent-share" key={p.id}>Waiting for {l.lender_name} to confirm {fmt(p.amount)}</p>)}
    {mine.filter(p=>p.status==='rejected'&&p.payer_tx_id).slice(0,1).map(p=><p className="lent-share is-bad" key={p.id}>{l.lender_name} did not get {fmt(p.amount)}. Check it and pay again.</p>)}
    {left>0.001&&<div className="lent-actions"><button className="btn btn-primary" onClick={()=>setModal({mode:'pay',loan:l})}>Pay back</button></div>}
   </>}
  </section>})}</div></>}
  {done.length>0&&<details className="debt-done"><summary><Check size={15}/> Paid back ({done.length})</summary><div className="debt-done-list">{done.map(r=><div className="debt-done-row" key={r.id}><div><b>{r.person}</b><small>{fmt(r.st.amount)} lent · {fmt(r.st.back)} back</small></div><div className="row-actions">{r.closed_at&&r.st.left>0&&<button className="select-lite" onClick={()=>onReopen(r)}>Reopen</button>}<button className="icon-btn danger-hover" title="Delete" aria-label={`Delete loan to ${r.person}`} onClick={()=>requestConfirm('Delete this loan?',`Delete the loan to ${r.person} and its money-back entries?`,()=>onDelete(r),'Delete')}><Trash2 size={15}/></button></div></div>)}</div></details>}
  {shown&&<LoanModal mode={shown.mode} loan={shown.loan} loans={loans} friends={friends} presetFriend={shown.mode==='lend'?presetFriend:null} accounts={accounts} transactions={transactions} currency={currency} onClose={()=>setModal(null)} onSubmit={async v=>{const ok=shown.mode==='lend'?await onLend(v):shown.mode==='pay'?await onOwePay(shown.loan,v):await onBack(shown.loan,v);if(ok)setModal(null);}}/>}
 </>;
}
