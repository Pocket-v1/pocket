import { useState } from 'react';
import { Check, Copy, UserPlus, Users, X } from '../../lib/icons.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { loanStatus } from '../debts/OwedToMe.jsx';

const MSG={sent:'Request sent',accepted:'You are now friends',already:'You are already friends',not_found:'No Pocket user with that username or email',self:'That is your own account'};

export function FriendsPage({friends=[],loans=[],owe=[],transactions=[],currency='EGP',onAdd,onRespond,onInvite,onLend,requestConfirm,setToast}){
 const [name,setName]=useState('');const [busy,setBusy]=useState(false);const [link,setLink]=useState('');
 const fmt=n=>new Intl.NumberFormat('en-EG',{style:'currency',currency,maximumFractionDigits:0}).format(Number(n)||0);
 const incoming=friends.filter(f=>f.status==='pending'&&f.incoming),outgoing=friends.filter(f=>f.status==='pending'&&!f.incoming),accepted=friends.filter(f=>f.status==='accepted'),blocked=friends.filter(f=>f.status==='blocked');
 const net=f=>{const mine=loans.filter(l=>String(l.friend_id)===String(f.friend_id)&&l.share_status!=='rejected').reduce((s,l)=>s+loanStatus(l,transactions).left,0);const theirs=owe.filter(l=>String(l.lender_id)===String(f.friend_id)&&l.share_status==='confirmed'&&!l.closed_at).reduce((s,l)=>s+Math.max(0,Number(l.amount)-Number(l.back||0)),0);return mine-theirs;};
 async function add(e){e.preventDefault();if(!name.trim())return;setBusy(true);try{const r=await onAdd(name.trim());setToast(MSG[r]||'Could not send the request');if(r==='sent'||r==='accepted')setName('');}finally{setBusy(false)}}
 async function invite(){const l=await onInvite();if(!l)return;setLink(l);try{await navigator.clipboard.writeText(l);setToast('Invite link copied');}catch{}}
 return <>
  <PageHeading eyebrow="PEOPLE" title="Friends" subtitle="Lend and borrow with friends. They only see the loans between you, never your accounts."/>
  <section className="panel friends-add">
   <form className="friends-add-row" onSubmit={add}><label className="field friends-add-field"><span>Username or email</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="@username or name@email.com" autoCapitalize="none" autoCorrect="off" inputMode="email"/></label><button className="btn btn-primary" disabled={busy||!name.trim()}><UserPlus size={16}/> {busy?'Sending…':'Send request'}</button></form>
   <div className="friends-invite"><span>Not on Pocket yet?</span><button type="button" className="btn btn-secondary btn-sm" onClick={invite}><Copy size={14}/> Copy invite link</button>{link&&<code className="friends-link">{link}</code>}</div>
  </section>
  {incoming.length>0&&<section className="friends-section"><h2>Requests</h2><div className="friends-list">{incoming.map(f=><div className="friend-row" key={f.id}><span className="lent-avatar">{(f.name||'?').charAt(0).toUpperCase()}</span><div className="friend-main"><b>{f.name}</b><small>@{f.username} wants to be friends</small></div><div className="friend-actions"><button className="btn btn-secondary btn-sm" onClick={()=>onRespond(f.id,'decline')}>Decline</button><button className="btn btn-primary btn-sm" onClick={()=>onRespond(f.id,'accept')}><Check size={14}/> Accept</button></div></div>)}</div></section>}
  <section className="friends-section"><h2>Your friends</h2>{accepted.length?<div className="friends-list">{accepted.map(f=>{const n=net(f);return <div className="friend-row" key={f.id}><span className="lent-avatar">{(f.name||'?').charAt(0).toUpperCase()}</span><div className="friend-main"><b>{f.name}</b><small>@{f.username}</small></div><div className={`friend-net ${n>0?'is-in':n<0?'is-out':''}`}>{n>0?`Owes you ${fmt(n)}`:n<0?`You owe ${fmt(-n)}`:'All settled'}</div><div className="friend-actions"><button className="btn btn-secondary btn-sm" onClick={()=>onLend(f)}>Lend</button><button className="icon-btn danger-hover" title="Remove friend" aria-label={`Remove ${f.name}`} onClick={()=>requestConfirm('Remove friend?',`Remove ${f.name} from your friends? Loans you already share stay as they are.`,()=>onRespond(f.id,'remove'),'Remove')}><X size={15}/></button></div></div>})}</div>:<EmptyState panel icon={Users} title="No friends yet" text="Add a friend by their Pocket username or email, or copy an invite link for someone who is not on Pocket yet."/>}</section>
  {outgoing.length>0&&<section className="friends-section"><h2>Sent requests</h2><div className="friends-list">{outgoing.map(f=><div className="friend-row" key={f.id}><span className="lent-avatar">{(f.name||'?').charAt(0).toUpperCase()}</span><div className="friend-main"><b>{f.name}</b><small>@{f.username} · waiting</small></div><div className="friend-actions"><button className="btn btn-secondary btn-sm" onClick={()=>onRespond(f.id,'remove')}>Cancel</button></div></div>)}</div></section>}
  {blocked.length>0&&<details className="debt-done"><summary>Blocked ({blocked.length})</summary><div className="debt-done-list">{blocked.map(f=><div className="debt-done-row" key={f.id}><div><b>{f.name}</b></div><button className="select-lite" onClick={()=>onRespond(f.id,'unblock')}>Unblock</button></div>)}</div></details>}
 </>;
}
