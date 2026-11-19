import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, Fuel, MessageCircle, MessageSquare, Plus, Receipt, Wrench, X , Mic, Camera, HandCoins} from '../../lib/icons.jsx';

export function QuickAdd({onPlus=null,canTransact=true,onTransaction,onType,onVoice,onPhoto,onSms,smsPending=0,onFuel,onService,showVehicles,onLend}){
 const [open,setOpen]=useState(false);const ref=useRef(null);
 useEffect(()=>{if(!open)return;const k=e=>{if(e.key==='Escape')setOpen(false)};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[open]);
 const run=fn=>()=>{setOpen(false);fn()};
 const hasVoice=onVoice&&typeof window!=='undefined'&&(window.SpeechRecognition||window.webkitSpeechRecognition);
 const fast=onType||hasVoice||onPhoto;
 const items=[...(canTransact?[{label:'Form',icon:Receipt,fn:onTransaction}]:[]),...(onLend?[{label:'Lend',icon:HandCoins,fn:onLend}]:[]),...(onSms?[{label:'SMS',icon:MessageSquare,fn:onSms,badge:smsPending}]:[]),...(showVehicles?[{label:'Fuel',icon:Fuel,fn:onFuel},{label:'Service',icon:Wrench,fn:onService}]:[])];
 if(!items.length&&!fast&&!onPlus)return null;
 return <div className="quick-add" ref={ref}>
  {open&&<button type="button" className="quick-add-scrim" aria-label="Close quick add" onClick={()=>setOpen(false)}/>}
  {open&&(onPlus?<div className="quick-add-menu quick-add-sheet" role="menu">
   {canTransact&&<div className="quick-add-tiles">{[['Expense',Plus,'tone-brand'],['Income',ArrowDownLeft,'tone-good'],['Transfer',ArrowLeftRight,'tone-plain']].map(([t,I,c])=><button key={t} type="button" role="menuitem" className={`quick-add-tile ${c}`} onClick={run(()=>onTransaction(t))}><I size={22}/><b>{t}</b></button>)}</div>}
   <button type="button" role="menuitem" className="quick-add-plus" onClick={run(onPlus)}><span className="quick-add-plus-head"><b>Faster ways to add</b><span className="plus-chip gold">Plus</span></span><span className="quick-add-plus-tiles"><span><MessageCircle size={22}/>Type</span><span><Mic size={22}/>Say</span><span><Camera size={22}/>Snap</span></span><small>Or let your bank SMS add it for you</small></button>
  </div>:<div className="quick-add-menu quick-add-lists" role="menu">
   {fast&&<div className="quick-add-card quick-add-fast">{onType?<button type="button" role="menuitem" className="quick-add-row" onClick={run(onType)}><MessageCircle size={18}/><b>Type</b></button>:<span className="quick-add-row"/>}{hasVoice&&<button type="button" role="menuitem" className="quick-add-icon" aria-label="Say it" onClick={run(onVoice)}><Mic size={18}/></button>}{onPhoto&&<button type="button" role="menuitem" className="quick-add-icon" aria-label="Snap a receipt" onClick={run(onPhoto)}><Camera size={18}/></button>}</div>}
   {items.length>0&&<div className="quick-add-card">{items.map(i=><button key={i.label} type="button" role="menuitem" className="quick-add-row muted-icon" onClick={run(i.fn)}><i.icon size={18}/><b>{i.label}</b>{i.badge>0&&<span className="quick-add-badge">{i.badge}</span>}</button>)}</div>}
  </div>)}
  <button type="button" className={`quick-add-fab ${open?'open':''}`} aria-label={open?'Close quick add':'Quick add'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<X size={22}/>:<Plus size={24}/>}</button>
 </div>;
}
