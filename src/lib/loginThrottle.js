/* Client-side sign-in brake: after repeated failures the form waits, a little longer each time.
   This is a courtesy + first line of defence in the UI; the real limit is enforced by Supabase Auth on the server. */
const KEY='pocket.loginThrottle.v1';
const STEPS=[0,0,0,0,30,60,120,300,900]; // seconds to wait after the Nth failure (5th failure → 30s …)
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}};

export function loginLockSeconds(now=Date.now()){
 const s=read();return s.until&&s.until>now?Math.ceil((s.until-now)/1000):0;
}
export function recordLoginFailure(now=Date.now()){
 const s=read();const fresh=s.last&&now-s.last<30*60*1000;const count=(fresh?s.count||0:0)+1;
 const wait=STEPS[Math.min(count,STEPS.length)-1]||0;
 write({count,last:now,until:wait?now+wait*1000:0});return wait;
}
export function clearLoginFailures(){try{localStorage.removeItem(KEY)}catch{}}
export function formatWait(sec){return sec>=60?`${Math.ceil(sec/60)} min`:`${sec}s`}
