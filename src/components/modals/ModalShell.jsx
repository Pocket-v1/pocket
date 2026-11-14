import { X } from '../../lib/icons.jsx';
import { useState } from 'react';

export function ModalShell({title,subtitle,onClose,children,wide=false}){
 const [stepHint,setStepHint]=useState('');
 const validateBeforeContinue=e=>{
  const button=e.target.closest('button');
  if(!button||button.disabled||!/continue|next|review/i.test(button.textContent||''))return;
  const modal=button.closest('.modal');
  const step=button.closest('.tx-wizard-page')||button.closest('section')||modal;
  if(!step)return;
  const fields=[...step.querySelectorAll('input[required],select[required],textarea[required]')].filter(el=>!el.disabled&&el.type!=='hidden');
  const missing=fields.filter(el=>!String(el.value||'').trim());
  if(missing.length){e.preventDefault();e.stopPropagation();setStepHint(`Please complete “${missing[0].closest('label')?.querySelector('span')?.textContent||missing[0].getAttribute('aria-label')||missing[0].name||'the required field'}” to continue.`);missing[0].focus?.();missing[0].scrollIntoView?.({behavior:'smooth',block:'center'});return;}
  setStepHint('');
 };
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className={`modal ${wide?'modal-wide':''}`} onClickCapture={validateBeforeContinue}><div className="modal-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={19}/></button></div>{stepHint&&<div role="alert" className="tx-wizard-warning" style={{margin:'12px 0',padding:'10px 12px'}}> {stepHint}</div>}{children}</div></div>
}
