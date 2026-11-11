import { useEffect, useMemo, useRef, useState } from 'react';
import { CarFront, CreditCard, Landmark, Receipt, Repeat2, Search, Target, Wallet, X } from '../../lib/icons.jsx';
import { fmt, shortDate } from '../../lib/format.js';

const KINDS={transaction:{label:'Transactions',icon:Receipt},account:{label:'Accounts',icon:Wallet},debt:{label:'Debts & installments',icon:Landmark},recurring:{label:'Subscriptions & bills',icon:Repeat2},goal:{label:'Savings goals',icon:Target},vehicle:{label:'Vehicles',icon:CarFront}};
const has=(q,...vals)=>vals.some(v=>String(v??'').toLowerCase().includes(q));

export function GlobalSearch({open,onClose,transactions=[],accounts=[],debts=[],recurring=[],goals=[],loadVehicles,onPick,currency}){
 const [q,setQ]=useState(''),[vehicles,setVehicles]=useState([]),[active,setActive]=useState(0);const input=useRef(null);
 useEffect(()=>{if(!open)return;setQ('');setActive(0);setTimeout(()=>input.current?.focus(),30);if(loadVehicles)loadVehicles().then(v=>setVehicles(v||[])).catch(()=>{})},[open]);
 const results=useMemo(()=>{const s=q.trim().toLowerCase();if(s.length<2)return [];const out=[];
  accounts.filter(a=>has(s,a.name,a.type)).slice(0,4).forEach(a=>out.push({kind:'account',id:a.id,title:a.name,sub:a.type||'Account'}));
  debts.filter(d=>has(s,d.name,d.lender,d.notes)).slice(0,4).forEach(d=>out.push({kind:'debt',id:d.id,title:d.name,sub:`Remaining ${fmt(d.remaining_amount||0,currency)}`}));
  recurring.filter(r=>has(s,r.name,r.category)).slice(0,4).forEach(r=>out.push({kind:'recurring',id:r.id,title:r.name,sub:`${fmt(r.amount||0,currency)} · ${r.frequency||''}`}));
  goals.filter(g=>has(s,g.name)).slice(0,3).forEach(g=>out.push({kind:'goal',id:g.id,title:g.name,sub:`${fmt(g.saved_amount||0,currency)} of ${fmt(g.target_amount||0,currency)}`}));
  vehicles.filter(v=>has(s,v.name,v.make,v.model,v.plate)).slice(0,3).forEach(v=>out.push({kind:'vehicle',id:v.id,title:v.name,sub:[v.make,v.model,v.plate].filter(Boolean).join(' · ')}));
  transactions.filter(t=>has(s,t.description,t.category,t.subcategory,t.notes,t.amount,t.transaction_date)).slice(0,8).forEach(t=>out.push({kind:'transaction',id:t.id,title:t.description||t.category,sub:`${shortDate(t.transaction_date)} · ${t.category} · ${t.type==='Income'?'+':t.type==='Expense'?'−':''}${fmt(t.amount,currency)}`,item:t}));
  return out},[q,accounts,debts,recurring,goals,vehicles,transactions,currency]);
 useEffect(()=>{setActive(0)},[q]);
 if(!open)return null;
 const pick=r=>{onPick(r);onClose()};
 const onKey=e=>{if(e.key==='Escape'){onClose()}else if(e.key==='ArrowDown'){e.preventDefault();setActive(a=>Math.min(a+1,results.length-1))}else if(e.key==='ArrowUp'){e.preventDefault();setActive(a=>Math.max(a-1,0))}else if(e.key==='Enter'&&results[active]){pick(results[active])}};
 let last='';
 return <div className="modal-backdrop gs-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="gs-panel" role="dialog" aria-modal="true" aria-label="Search Pocket" onKeyDown={onKey}>
  <div className="gs-input"><Search size={18}/><input ref={input} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search transactions, accounts, debts, vehicles…" aria-label="Search"/><button type="button" className="icon-btn" onClick={onClose} aria-label="Close search"><X size={16}/></button></div>
  <div className="gs-results">
   {q.trim().length<2&&<p className="gs-hint">Type at least 2 letters. Try a merchant, a category, an account name or an amount.</p>}
   {q.trim().length>=2&&!results.length&&<p className="gs-hint">Nothing matches “{q.trim()}”.</p>}
   {results.map((r,i)=>{const K=KINDS[r.kind];const head=last!==r.kind;last=r.kind;return <div key={r.kind+r.id}>{head&&<div className="gs-group">{K.label}</div>}<button type="button" className={`gs-row ${i===active?'active':''}`} onMouseEnter={()=>setActive(i)} onClick={()=>pick(r)}><span className="gs-icon"><K.icon size={16}/></span><span className="gs-main"><b>{r.title}</b><small>{r.sub}</small></span></button></div>})}
  </div>
  <div className="gs-foot"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></div>
 </section></div>;
}
