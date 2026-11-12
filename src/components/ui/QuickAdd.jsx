import { useEffect, useRef, useState } from 'react';
import { Fuel, MessageCircle, MessageSquare, Plus, Receipt, Wrench, X , Mic, Camera} from '../../lib/icons.jsx';

export function QuickAdd({onTransaction,onType,onVoice,onPhoto,onSms,smsPending=0,onFuel,onService,showVehicles}){
 const [open,setOpen]=useState(false);const ref=useRef(null);
 useEffect(()=>{if(!open)return;const k=e=>{if(e.key==='Escape')setOpen(false)};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[open]);
 const run=fn=>()=>{setOpen(false);fn()};
 const items=[...(onType?[{label:'Type it',sub:'صرفت 200 على أكل',icon:MessageCircle,fn:onType}]:[]),...(onVoice&&typeof window!=='undefined'&&(window.SpeechRecognition||window.webkitSpeechRecognition)?[{label:'Say it',sub:'Speak Arabic or English',icon:Mic,fn:onVoice}]:[]),...(onPhoto?[{label:'Snap a receipt',sub:'Pocket reads the total',icon:Camera,fn:onPhoto}]:[]),{label:'Fill a form',sub:'Expense, income or transfer',icon:Receipt,fn:onTransaction},...(onSms?[{label:'From a bank SMS',sub:smsPending?`${smsPending} message${smsPending===1?'':'s'} waiting`:'Review messages from your bank',icon:MessageSquare,fn:onSms}]:[]),...(showVehicles?[{label:'Log fuel',icon:Fuel,fn:onFuel},{label:'Log service',icon:Wrench,fn:onService}]:[])];
 return <div className="quick-add" ref={ref}>
  {open&&<button type="button" className="quick-add-scrim" aria-label="Close quick add" onClick={()=>setOpen(false)}/>}
  {open&&<div className="quick-add-menu" role="menu">{items.map(i=><button key={i.label} type="button" role="menuitem" className="quick-add-item" onClick={run(i.fn)}><span><i.icon size={18}/></span><b>{i.label}{i.sub&&<small>{i.sub}</small>}</b></button>)}</div>}
  <button type="button" className={`quick-add-fab ${open?'open':''}`} aria-label={open?'Close quick add':'Quick add'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<X size={22}/>:<Plus size={24}/>}</button>
 </div>;
}
