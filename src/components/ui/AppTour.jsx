import { ChevronLeft, ChevronRight, X } from '../../lib/icons.jsx';
import { useState } from 'react';
import { TOUR_STEPS } from './pageTips.js';

export function AppTour({ onClose }) {
  const [i, setI] = useState(0);
  const last = i === TOUR_STEPS.length - 1;
  const s = TOUR_STEPS[i];
  return <div className="tour-back" role="dialog" aria-modal="true" aria-label="App tour">
    <div className="tour-card" key={i}>
      <button type="button" className="tour-x" aria-label="Skip tour" onClick={onClose}><X size={16}/></button>
      <div className="tour-step">Step {i + 1} of {TOUR_STEPS.length}</div>
      <h2>{s.title}</h2>
      <p>{s.text}</p>
      <div className="tour-dots">{TOUR_STEPS.map((_, k) => <i key={k} className={k === i ? 'on' : ''}/>)}</div>
      <div className="tour-actions">
        <button type="button" className="btn ghost" onClick={() => (i ? setI(i - 1) : onClose())}>{i ? <><ChevronLeft size={16}/>Back</> : 'Skip'}</button>
        <button type="button" className="btn primary" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? 'Done' : <>Next<ChevronRight size={16}/></>}</button>
      </div>
    </div>
  </div>;
}
