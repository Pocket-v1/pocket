import { useEffect, useRef, useState } from 'react';

/* Counts the first number inside `value` up from 0 (and between values later).
   Works with "EGP 42,000", "56%", 12 … anything else is shown as-is. */
const NUM=/-?\d[\d,]*(?:\.\d+)?/;
const reduced=()=>{try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch{return false}};

export function AnimatedNumber({value,duration=900}){
 const text=typeof value==='number'?String(value):typeof value==='string'?value:null;
 const single=text&&(text.match(new RegExp(NUM.source,'g'))||[]).length===1&&!/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i.test(text);
 const m=single?text.match(NUM):null;
 const target=m?Number(m[0].replace(/,/g,'')):null;
 const decimals=m&&m[0].includes('.')?m[0].split('.')[1].length:0;
 const [shown,setShown]=useState(m&&!reduced()?0:target);
 const from=useRef(0);
 useEffect(()=>{
  if(target==null||!Number.isFinite(target))return;
  if(reduced()){setShown(target);from.current=target;return}
  const start=from.current,t0=performance.now(),dur=start===0?duration:600;let raf;
  const tick=now=>{const p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,3);const v=start+(target-start)*e;setShown(v);from.current=v;if(p<1)raf=requestAnimationFrame(tick);else{setShown(target);from.current=target}};
  raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[target,duration]);
 if(!m||target==null||!Number.isFinite(target))return <>{value}</>;
 const useCommas=m[0].includes(',')||Math.abs(target)>=1000;
 const body=Number(shown).toLocaleString('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals,useGrouping:useCommas});
 const idx=text.indexOf(m[0]);
 return <span className="count-num" title={text} style={{fontVariantNumeric:'tabular-nums'}}>{text.slice(0,idx)}{body}{text.slice(idx+m[0].length)}</span>;
}
