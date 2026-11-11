import { Info, X } from '../../lib/icons.jsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PAGE_TIPS } from './pageTips.js';

export function TipButton({ tips }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const pop = useRef(null);
  const toggle = () => {
    if (open) return setOpen(false);
    const r = btn.current.getBoundingClientRect();
    const w = Math.min(310, window.innerWidth - 32);
    setPos({ top: r.bottom + 8, left: Math.max(16, Math.min(r.left, window.innerWidth - w - 16)), w });
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const off = e => { if (!btn.current?.contains(e.target) && !pop.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    window.addEventListener('scroll', close, true); window.addEventListener('resize', close);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [open]);
  return <span className="tip-wrap">
    <button type="button" ref={btn} className="tip-btn" aria-label="Tips for this page" aria-expanded={open} onClick={toggle}><Info size={16}/></button>
    {open && pos && createPortal(<div ref={pop} className="tip-pop" role="dialog" aria-label="Page tips" style={{ top: pos.top, left: pos.left, width: pos.w }}>
      <div className="tip-head"><b>Tips</b><button type="button" aria-label="Close tips" onClick={() => setOpen(false)}><X size={14}/></button></div>
      <ul>{tips.map((t, i) => <li key={i} style={{ '--i': i }}>{t}</li>)}</ul>
      <button type="button" className="tip-replay" onClick={() => { setOpen(false); window.dispatchEvent(new Event('pocket:tour')); }}>Replay app tour</button>
    </div>, document.body)}
  </span>;
}

export function PageHeading({eyebrow,title,subtitle,actions,titleExtra,className=''}){
  const isGreeting=className.includes('greeting-heading')||(typeof title==='string'&&/^(Good morning|Good afternoon|Good evening)/.test(title));
  const tips=isGreeting?PAGE_TIPS.overview:(typeof title==='string'?PAGE_TIPS[title]:null);
  return <div className={`page-heading ${className}${isGreeting?' greeting-heading':''}`}><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}{tips&&!isGreeting&&<TipButton tips={tips}/>}{titleExtra}</h1>{subtitle&&<p>{subtitle}</p>}</div><div className="heading-actions">{tips&&isGreeting&&<TipButton tips={tips}/>}{actions}</div></div>
}
