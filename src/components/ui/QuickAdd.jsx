import { useEffect, useRef, useState } from 'react';
import { Fuel, Plus, Receipt, Wrench, X } from '../../lib/icons.jsx';

export function QuickAdd({onTransaction,onFuel,onService,showVehicles}){
 const [open,setOpen]=useState(false);const ref=useRef(null);
 useEffect(()=>{if(!open)return;const k=e=>{if(e.key==='Escape')setOpen(false)};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[open]);
 const run=fn=>()=>{setOpen(false);fn()};
 const items=[{label:'Add transaction',icon:Receipt,fn:onTransaction},...(showVehicles?[{label:'Log fuel',icon:Fuel,fn:onFuel},{label:'Log service',icon:Wrench,fn:onService}]:[])];
 return <div className="quick-add" ref={ref}>
  {open&&<button type="button" className="quick-add-scrim" aria-label="Close quick add" onClick={()=>setOpen(false)}/>}
  {open&&<div className="quick-add-menu" role="menu">{items.map(i=><button key={i.label} type="button" role="menuitem" className="quick-add-item" onClick={run(i.fn)}><span><i.icon size={18}/></span>{i.label}</button>)}</div>}
  <button type="button" className={`quick-add-fab ${open?'open':''}`} aria-label={open?'Close quick add':'Quick add'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<X size={22}/>:<Plus size={24}/>}</button>
 </div>;
}
