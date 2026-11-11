import { Check } from '../../lib/icons.jsx';

export function WizardProgress({step,total=3,labels}){return <div className="tx-wizard-progress"><div className="tx-wizard-steps">{labels.map((label,i)=><div key={label} className={`tx-wizard-step ${step===i+1?'active':step>i+1?'complete':''}`}><span>{step>i+1?<Check size={14}/>:i+1}</span><b>{label}</b></div>)}</div><div className="tx-wizard-track" aria-hidden="true">{Array.from({length:total},(_,i)=><span key={i} className={step>i?'on':''}/>)}</div></div>}
