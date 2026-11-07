import { useState } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';

export function OnboardingChecklist({storageKey,steps}){
 const [hidden,setHidden]=useState(()=>{try{return localStorage.getItem(storageKey)==='1'||steps.every(x=>x.done)}catch{return steps.every(x=>x.done)}});
 const done=steps.filter(s=>s.done).length,all=done===steps.length;
 if(hidden)return null;
 const hide=()=>{setHidden(true);try{localStorage.setItem(storageKey,'1')}catch{}};
 const next=steps.find(s=>!s.done);
 return <section className="panel onboarding" aria-label="Getting started">
  <div className="onboarding-head"><div><h2>{all?'You’re all set 🎉':'Get Pocket set up'}</h2><p>{all?'Everything is in place. Your overview now reflects your real numbers.':`${done} of ${steps.length} done — each step takes under a minute.`}</p></div><button type="button" className="icon-btn" onClick={hide} aria-label="Hide checklist" title="Hide checklist"><X size={16}/></button></div>
  <div className="onboarding-bar" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}><i style={{width:`${done/steps.length*100}%`}}/></div>
  <ol className="onboarding-steps">{steps.map((s,i)=><li key={s.key} className={`${s.done?'done':''} ${next&&next.key===s.key?'next':''}`}><button type="button" className="onboarding-step" onClick={s.action} disabled={s.done}><span className="onboarding-dot">{s.done?<Check size={14}/>:i+1}</span><span className="onboarding-copy"><b>{s.title}</b><small>{s.hint}</small></span>{!s.done&&<ChevronRight size={16}/>}</button></li>)}</ol>
  {all&&<div className="onboarding-foot"><button type="button" className="btn btn-primary btn-sm" onClick={hide}>Done</button></div>}
 </section>;
}
