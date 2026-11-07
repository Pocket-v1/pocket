import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/* Button that opens a small menu. Items: {label, description, icon, onClick} or {label, description, icon, file:{accept,onFile}} */
export function MenuButton({label,icon:Icon,items,className='btn btn-secondary',disabled=false}){
 const [open,setOpen]=useState(false);const ref=useRef(null);
 useEffect(()=>{
  if(!open)return;
  const onDown=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};
  const onKey=e=>{if(e.key==='Escape')setOpen(false)};
  document.addEventListener('mousedown',onDown);document.addEventListener('keydown',onKey);
  return()=>{document.removeEventListener('mousedown',onDown);document.removeEventListener('keydown',onKey)};
 },[open]);
 return <div className="menu-wrap" ref={ref}>
  <button type="button" className={className} aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={()=>setOpen(o=>!o)}>{Icon&&<Icon size={16}/>}<span>{label}</span><ChevronDown size={15} className="menu-caret"/></button>
  {open&&<div className="menu-popover" role="menu">{items.map((it,i)=>it.divider?<div key={i} className="menu-divider" role="separator"/>:it.file
   ?<label key={i} className="menu-item" role="menuitem" tabIndex={0}><span className="menu-item-icon">{it.icon&&<it.icon size={16}/>}</span><span className="menu-item-copy"><b>{it.label}</b>{it.description&&<small>{it.description}</small>}</span><input type="file" accept={it.file.accept} onChange={e=>{setOpen(false);it.file.onFile(e)}}/></label>
   :<button key={i} type="button" className="menu-item" role="menuitem" onClick={()=>{setOpen(false);it.onClick()}}><span className="menu-item-icon">{it.icon&&<it.icon size={16}/>}</span><span className="menu-item-copy"><b>{it.label}</b>{it.description&&<small>{it.description}</small>}</span></button>)}</div>}
 </div>;
}
