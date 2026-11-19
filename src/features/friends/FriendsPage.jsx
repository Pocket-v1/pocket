import { useState } from 'react';
import { useEffect } from 'react';
import { Check, ChevronRight, Copy, QrCode, Search, Share, Users, X } from '../../lib/icons.jsx';
import { isGoalsAccount } from '../../lib/features.js';
import { localISODate, shortDate } from '../../lib/format.js';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { LoanModal, loanStatus } from '../debts/OwedToMe.jsx';

function SplitModal({friends,accounts,categories,currency,onClose,onSubmit}){
 const usable=accounts.filter(a=>!isGoalsAccount(a));
 const [title,setTitle]=useState('');const [total,setTotal]=useState('');const [date,setDate]=useState(localISODate());const [accountId,setAccountId]=useState(usable[0]?.id||'');const [category,setCategory]=useState(categories.find(c=>/food|dining/i.test(c))||categories[0]||'Other');
 const [picked,setPicked]=useState([]);const [me,setMe]=useState(true);const [busy,setBusy]=useState(false);const [q,setQ]=useState('');const [listOpen,setListOpen]=useState(true);const [details,setDetails]=useState(false);const [mode,setMode]=useState('equal');const [amounts,setAmounts]=useState({});
 const fmt=n=>new Intl.NumberFormat('en-EG',{style:'currency',currency,maximumFractionDigits:2}).format(Number(n)||0);
 const r2=n=>Math.round(n*100)/100;
 const people=friends.filter(f=>picked.includes(f.friend_id));const parts=people.length+(me?1:0);const t=Number(total||0);
 const equalShare=parts?r2(t/parts):0;
 const shareOf=f=>mode==='equal'?equalShare:Number(amounts[f.friend_id]||0);
 const friendsSum=r2(people.reduce((s,f)=>s+shareOf(f),0));const myShare=me?r2(Math.max(0,t-friendsSum)):0;
 const left=r2(t-friendsSum-(mode==='custom'&&me?myShare:0));
 const customOk=mode==='equal'||(people.every(f=>shareOf(f)>0)&&friendsSum<=t+0.001&&(me||Math.abs(friendsSum-t)<0.01));
 const ok=title.trim()&&t>0&&accountId&&people.length>0&&customOk;
 const shown=friends.filter(f=>!q.trim()||`${f.name} ${f.username}`.toLowerCase().includes(q.trim().toLowerCase())).sort((a,b)=>Number(picked.includes(b.friend_id))-Number(picked.includes(a.friend_id)));
 const toggle=id=>setPicked(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
 const names=[...(me?['You']:[]),...people.map(p=>p.name)];const label=names.length?`${names.slice(0,3).join(', ')}${names.length>3?` +${names.length-3}`:''}`:'Choose who is in';
 const acc=usable.find(a=>String(a.id)===String(accountId));
 async function submit(){if(!ok)return;setBusy(true);try{await onSubmit({title:title.trim(),total:t,date,accountId,category,people:people.map(f=>({...f,amount:r2(shareOf(f))})),myShare})}finally{setBusy(false)}}
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal debt-pay" role="dialog" aria-modal="true" aria-labelledby="split-title">
  <div className="debt-pay-head"><div><span className="debt-pay-eyebrow">Friends</span><h2 id="split-title">Split a bill</h2><p>You paid. Each share is recorded once that friend confirms.</p></div><button type="button" className="debt-pay-close" onClick={onClose} aria-label="Close">×</button></div>
  <div className="debt-pay-body">
   <div className="split-top"><label className="debt-pay-field"><span>What was it?</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Dinner" autoFocus/></label><label className="debt-pay-field split-total"><span>Total</span><input type="number" inputMode="decimal" min="0.01" step="0.01" value={total} onChange={e=>setTotal(e.target.value)} placeholder="0"/></label></div>
   <button type="button" className="split-who" aria-expanded={listOpen} onClick={()=>setListOpen(v=>!v)}>
    <span className="split-stack">{me&&<span className="split-av is-me">Me</span>}{people.slice(0,me?2:3).map(f=><span key={f.friend_id} className="split-av">{(f.name||'?').charAt(0).toUpperCase()}</span>)}{names.length>3&&<span className="split-av">+{names.length-3}</span>}</span>
    <span className="split-who-text"><b>{label}</b><small>{listOpen?'Tap to close the list':'Tap to change who is in'}</small></span><ChevronRight size={16} className="split-chev"/>
   </button>
   {listOpen&&<div className="split-pick">
    {friends.length>5&&<label className="split-search"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search friends" aria-label="Search friends"/></label>}
    <div className="split-list" role="group" aria-label="Friends to split with">
     <label className="split-row is-me"><input type="checkbox" checked={me} onChange={e=>setMe(e.target.checked)}/><span className="split-av is-me">Me</span><span className="split-name">Me too</span></label>
     {shown.map(f=><label key={f.friend_id} className={`split-row ${picked.includes(f.friend_id)?'is-on':''}`}><input type="checkbox" checked={picked.includes(f.friend_id)} onChange={()=>toggle(f.friend_id)}/><span className="split-av">{(f.name||'?').charAt(0).toUpperCase()}</span><span className="split-name">{f.name}<small>@{f.username}</small></span></label>)}
     {!shown.length&&<p className="lent-note">No friend matches “{q}”.</p>}
    </div>
   </div>}
   {people.length>0&&<div className="split-modes" role="tablist" aria-label="How to split"><button type="button" role="tab" aria-selected={mode==='equal'} className={mode==='equal'?'is-on':''} onClick={()=>setMode('equal')}>Split equally</button><button type="button" role="tab" aria-selected={mode==='custom'} className={mode==='custom'?'is-on':''} onClick={()=>{setMode('custom');setAmounts(a=>{const n={...a};people.forEach(f=>{if(!n[f.friend_id])n[f.friend_id]=String(equalShare||'')});return n;});}}>Custom amounts</button></div>}
   {mode==='custom'&&people.length>0&&<div className="split-custom">{people.map(f=><label key={f.friend_id} className="split-custom-row"><span className="split-av">{(f.name||'?').charAt(0).toUpperCase()}</span><span className="split-name">{f.name}</span><input type="number" inputMode="decimal" min="0.01" step="0.01" aria-label={`Amount for ${f.name}`} value={amounts[f.friend_id]??''} onChange={e=>setAmounts(a=>({...a,[f.friend_id]:e.target.value}))}/></label>)}{me&&<div className="split-custom-row is-me"><span className="split-av is-me">Me</span><span className="split-name">Your share</span><b>{fmt(myShare)}</b></div>}<p className={`split-assigned ${customOk?'is-ok':'is-bad'}`}>{friendsSum>t+0.001?`Friends' shares are ${fmt(friendsSum-t)} more than the total.`:!me&&Math.abs(friendsSum-t)>=0.01?`${fmt(t-friendsSum)} still to assign.`:`${fmt(friendsSum+myShare)} of ${fmt(t)} assigned ✓`}</p></div>}
   <div className="split-sum"><div><span>{mode==='equal'?'Each pays':'Friends pay'}</span><b>{fmt(mode==='equal'?equalShare:friendsSum)}</b></div><div><span>You get back</span><b className="is-in">{fmt(friendsSum)}</b></div></div>
   <div className="split-meta"><span>{acc?.name||'Choose account'}</span><span>·</span><span>{category}</span><span>·</span><span>{date===localISODate()?'Today':shortDate(date)}</span><button type="button" onClick={()=>setDetails(v=>!v)}>{details?'Done':'Change'}</button></div>
   {details&&<div className="debt-pay-row"><label className="debt-pay-field"><span>Paid from</span><select value={accountId} onChange={e=>setAccountId(e.target.value)}>{usable.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label className="debt-pay-field"><span>Category</span><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label><label className="debt-pay-field"><span>Date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>}
  </div>
  <div className="debt-pay-actions"><button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="button" disabled={busy||!ok} onClick={submit}>{busy?'Sending…':people.length?`Send to ${people.length} friend${people.length===1?'':'s'}`:'Split and send'}</button></div>
 </section></div>;
}

const MSG={sent:'Request sent',accepted:'You are now friends',already:'You are already friends',not_found:'No Pocket user with that username or email',self:'That is your own account'};

export function FriendsPage({friends=[],loans=[],owe=[],transactions=[],currency='EGP',onAdd,onRespond,onInvite,onLendMoney,accounts=[],allFriends=[],requestConfirm,setToast,onSplit,onBorrow,categories=[],payments=[],focusFriend=null}){
 const [lendTo,setLendTo]=useState(null);const [split,setSplit]=useState(false);const [openId,setOpenId]=useState(focusFriend);
 const [name,setName]=useState('');const [busy,setBusy]=useState(false);const [link,setLink]=useState('');const [qr,setQr]=useState('');const [copied,setCopied]=useState(false);const [showQr,setShowQr]=useState(false);
 const fmt=n=>new Intl.NumberFormat('en-EG',{style:'currency',currency,maximumFractionDigits:0}).format(Number(n)||0);
 const incoming=friends.filter(f=>f.status==='pending'&&f.incoming),outgoing=friends.filter(f=>f.status==='pending'&&!f.incoming),accepted=friends.filter(f=>f.status==='accepted'),blocked=friends.filter(f=>f.status==='blocked');
 const waitingFor=f=>loans.some(l=>String(l.friend_id)===String(f.friend_id)&&['pending','requested'].includes(l.share_status))||owe.some(l=>String(l.lender_id)===String(f.friend_id)&&['pending','requested'].includes(l.share_status));
 const net=f=>{const mine=loans.filter(l=>String(l.friend_id)===String(f.friend_id)&&l.share_status==='confirmed').reduce((s,l)=>s+loanStatus(l,transactions).left,0);const theirs=owe.filter(l=>String(l.lender_id)===String(f.friend_id)&&l.share_status==='confirmed'&&!l.closed_at).reduce((s,l)=>s+Math.max(0,Number(l.amount)-Number(l.back||0)),0);return mine-theirs;};
 const netText=f=>{const n=net(f);return n>0?`Owes you ${fmt(n)}`:n<0?`You owe ${fmt(-n)}`:waitingFor(f)?'Waiting to confirm':'All settled';};
 async function add(e){e.preventDefault();if(!name.trim())return;setBusy(true);try{const r=await onAdd(name.trim());setToast(MSG[r]||'Could not send the request');if(r==='sent'||r==='accepted')setName('');}finally{setBusy(false)}}
 useEffect(()=>{let live=true;(async()=>{const l=await onInvite();if(!live||!l)return;setLink(l);try{const Q=await import('qrcode');const url=await Q.toDataURL(l,{margin:1,width:220,color:{dark:'#131a3a',light:'#ffffff'}});if(live)setQr(url);}catch{}})();return()=>{live=false}},[]); // eslint-disable-line react-hooks/exhaustive-deps
 async function copy(){if(!link)return;try{await navigator.clipboard.writeText(link);setCopied(true);setTimeout(()=>setCopied(false),1600);}catch{window.prompt('Copy this invite link',link);}}
 async function share(){if(!link)return;const data={title:'Pocket',text:'Join me on Pocket to track money together.',url:link};if(navigator.share){try{await navigator.share(data);}catch{}}else copy();}
 const open=accepted.find(f=>f.friend_id===openId);
 return <>
  <PageHeading eyebrow="PEOPLE" title="Friends" subtitle="Lend, borrow and split with friends. They only see what is between you, never your accounts." actions={accepted.length>0&&<button className="btn btn-primary" onClick={()=>setSplit(true)}><Users size={17}/> Split a bill</button>}/>
  <section className="friends-hero">
   <div className="friends-orbit" aria-hidden="true"><span>A</span><span>S</span><span>M</span></div>
   <b className="friends-hero-title">Bring a friend to Pocket</b>
   <span className="friends-hero-text">When they sign up, your friend request is waiting for them.</span>
   <div className="friends-hero-actions">
    <button type="button" className="friends-hero-share" onClick={share} disabled={!link}><Share size={16}/> Share invite</button>
    <button type="button" className="friends-hero-icon" onClick={copy} disabled={!link} aria-label={copied?'Copied':'Copy invite link'} title="Copy invite link">{copied?<Check size={18} className="friends-pop"/>:<Copy size={18}/>}</button>
    <button type="button" className={`friends-hero-icon ${showQr?'is-on':''}`} onClick={()=>setShowQr(v=>!v)} disabled={!link} aria-label={showQr?'Hide QR code':'Show QR code'} aria-expanded={showQr} title="QR code"><QrCode size={18}/></button>
   </div>
   {showQr&&qr&&<img className="friends-hero-qr friends-pop" src={qr} alt="QR code for your Pocket invite link" width="148" height="148"/>}
  </section>
  <form className="friends-find" onSubmit={add}><Search size={16}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Add by username or email" aria-label="Add a friend by username or email" autoCapitalize="none" autoCorrect="off" inputMode="email"/><button className="btn btn-primary btn-sm" disabled={busy||!name.trim()}>{busy?'Sending…':'Add'}</button></form>
  {incoming.length>0&&<section className="friends-section"><h2>Requests</h2><div className="friends-list">{incoming.map(f=><div className="friend-item" key={f.id}><span className="lent-avatar">{(f.name||'?').charAt(0).toUpperCase()}</span><span className="friend-main"><b>{f.name}</b><small>@{f.username} wants to be friends</small></span><span className="friend-actions"><button className="btn btn-secondary btn-sm" onClick={()=>requestConfirm(`Block ${f.name}?`,`${f.name} won't be able to send you requests. You can unblock later.`,()=>onRespond(f.id,'block'),'Block')}>Block</button><button className="btn btn-secondary btn-sm" onClick={()=>onRespond(f.id,'decline')}>Decline</button><button className="btn btn-primary btn-sm" onClick={()=>onRespond(f.id,'accept')}><Check size={14}/> Accept</button></span></div>)}</div></section>}
  <section className="friends-section"><h2>Your friends</h2>{accepted.length?<div className="friends-list">{accepted.map((f,i)=>{const n=net(f);return <button type="button" className="friend-item is-link friends-rise" style={{animationDelay:`${Math.min(i,8)*60+80}ms`}} key={f.id} onClick={()=>setOpenId(f.friend_id)}><span className="lent-avatar">{(f.name||'?').charAt(0).toUpperCase()}</span><span className="friend-main"><b>{f.name}</b><small>@{f.username}</small></span><span className={`friend-net ${n>0?'is-in':n<0?'is-out':''}`}>{netText(f)}</span><ChevronRight size={16}/></button>})}</div>:<EmptyState panel icon={Users} title="No friends yet" text="Add a friend by their Pocket username or email, or share your invite link."/>}</section>
  {outgoing.length>0&&<section className="friends-section"><h2>Sent requests</h2><div className="friends-list">{outgoing.map(f=><div className="friend-item" key={f.id}><span className="lent-avatar">{(f.name||'?').charAt(0).toUpperCase()}</span><span className="friend-main"><b>{f.name}</b><small>@{f.username} · waiting</small></span><span className="friend-actions"><button className="btn btn-secondary btn-sm" onClick={()=>onRespond(f.id,'remove')}>Cancel</button></span></div>)}</div></section>}
  {blocked.length>0&&<details className="debt-done"><summary>Blocked ({blocked.length})</summary><div className="debt-done-list">{blocked.map(f=><div className="debt-done-row" key={f.id}><div><b>{f.name}</b></div><button className="select-lite" onClick={()=>onRespond(f.id,'unblock')}>Unblock</button></div>)}</div></details>}
  {open&&<FriendSheet f={open} n={net(open)} netText={netText(open)} loans={loans} owe={owe} transactions={transactions} fmt={fmt} onClose={()=>setOpenId(null)} onLend={()=>{setLendTo(open);setOpenId(null)}} onBorrow={()=>{onBorrow(open);setOpenId(null)}} onSplit={()=>{setSplit(true);setOpenId(null)}} onBlock={()=>requestConfirm(`Block ${open.name}?`,`${open.name} won't be able to send you requests or new loans. Loans you already confirmed stay for both of you. You can unblock later.`,()=>{onRespond(open.id,'block');setOpenId(null)},'Block')} onRemove={()=>requestConfirm('Remove friend?',`Remove ${open.name} from your friends? Loans you already confirmed stay for both of you.`,()=>{onRespond(open.id,'remove');setOpenId(null)},'Remove')}/>}
  {lendTo&&<LoanModal mode="lend" loans={loans} friends={allFriends} presetFriend={lendTo} accounts={accounts} transactions={transactions} currency={currency} onClose={()=>setLendTo(null)} onSubmit={async v=>{if(await onLendMoney(v))setLendTo(null);}}/>}
  {split&&<SplitModal friends={accepted} accounts={accounts} categories={categories} currency={currency} onClose={()=>setSplit(false)} onSubmit={async v=>{if(await onSplit(v))setSplit(false);}}/>}
 </>;
}

function FriendSheet({f,n,netText,loans,owe,transactions,fmt,onClose,onLend,onBorrow,onSplit,onRemove,onBlock}){
 const [tab,setTab]=useState('loans');
 useEffect(()=>{const k=e=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[onClose]);
 const status=s=>s==='confirmed'?null:s==='rejected'?'Not confirmed':'Waiting to confirm';
 const rows=[...loans.filter(l=>String(l.friend_id)===String(f.friend_id)).map(l=>{const st=loanStatus(l,transactions);return {id:l.id,date:l.lent_on,title:l.note?l.note.replace(/^Split: /,'Split · '):'You lent',amount:Number(l.amount),dir:'in',sub:status(l.share_status)||(st.done?'Paid back':`${fmt(st.left)} left`)};}),
  ...owe.filter(l=>String(l.lender_id)===String(f.friend_id)).map(l=>{const left=Math.max(0,Number(l.amount)-Number(l.back||0));return {id:l.id,date:l.lent_on,title:l.note?l.note.replace(/^Split: /,'Split · '):'You borrowed',amount:Number(l.amount),dir:'out',sub:status(l.share_status)||(left>0.001?`${fmt(left)} left`:'Paid back')};})].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 const spent=transactions.filter(t=>String(t.friend_id)===String(f.friend_id)&&!t.loan_given_id).sort((a,b)=>String(b.transaction_date).localeCompare(String(a.transaction_date)));
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal friend-sheet" role="dialog" aria-modal="true" aria-labelledby="friend-sheet-title">
  <button type="button" className="debt-pay-close friend-sheet-close" onClick={onClose} aria-label="Close">×</button>
  <div className="friend-sheet-head"><span className="friend-sheet-avatar">{(f.name||'?').charAt(0).toUpperCase()}</span><h2 id="friend-sheet-title">{f.name}</h2><small>@{f.username}</small></div>
  <div className={`friend-sheet-balance ${n>0?'is-in':n<0?'is-out':''}`}><span>{n>0?'Owes you':n<0?'You owe':'Balance'}</span><b>{n===0?netText:fmt(Math.abs(n))}</b></div>
  <div className="friend-sheet-actions"><button className="btn btn-primary" onClick={onLend}>Lend</button><button className="btn btn-secondary" onClick={onBorrow}>Borrow</button><button className="btn btn-secondary" onClick={onSplit}>Split</button></div>
  <div className="friend-sheet-tabs" role="tablist"><button role="tab" aria-selected={tab==='loans'} className={tab==='loans'?'is-on':''} onClick={()=>setTab('loans')}>Loans ({rows.length})</button><button role="tab" aria-selected={tab==='spent'} className={tab==='spent'?'is-on':''} onClick={()=>setTab('spent')}>Spent together ({spent.length})</button></div>
  <div className="friend-sheet-list">{tab==='loans'?(rows.length?rows.map(r=><div className="friend-sheet-row" key={r.id}><span className={`friend-dir ${r.dir==='in'?'is-in':'is-out'}`} aria-hidden="true">{r.dir==='in'?'↑':'↓'}</span><span className="friend-main"><b>{r.title}</b><small>{shortDate(r.date)} · {r.sub}</small></span><b>{fmt(r.amount)}</b></div>):<p className="lent-note friend-sheet-empty">No loans yet. Lend or borrow to start.</p>):(spent.length?spent.slice(0,30).map(t=><div className="friend-sheet-row" key={t.id}><span className="friend-dir" aria-hidden="true">•</span><span className="friend-main"><b>{t.description||t.category}</b><small>{shortDate(t.transaction_date)} · {t.category}</small></span><b>{fmt(t.amount)}</b></div>):<p className="lent-note friend-sheet-empty">Pick “With a friend” on a transaction to see it here.</p>)}</div>
  <div className="friend-sheet-foot"><button type="button" className="friend-sheet-remove" onClick={onRemove}><X size={14}/> Remove friend</button><button type="button" className="friend-sheet-remove" onClick={onBlock}>Block</button></div>
 </section></div>;
}
