import { ArrowDownLeft, ArrowUpRight, CalendarClock, Car, Check, CreditCard, Landmark, LoaderCircle, LockKeyhole, Moon, Sun, Target } from '../../lib/icons.jsx';
import { useState } from 'react';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber.jsx';
import { PasswordInput } from '../../components/ui/PasswordInput.jsx';
import { UsernameStatus } from '../../components/ui/UsernameStatus.jsx';
import { PasswordRules, passwordOk } from '../../components/ui/PasswordRules.jsx';
import { ArtCalendar, ArtCard, ArtCoins, ArtGoal, ArtNote, ArtReceipt } from './LoginArt.jsx';

const GOOGLE=<svg viewBox="0 0 48 48" aria-hidden="true" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.05 46.98 31.95 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.88 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>;

function initialStyle(){
 try{const q=new URLSearchParams(window.location.search).get('login');if(q==='1'||q==='2')return Number(q)}catch{}
 return 2;
}

export function AuthScreen(p){
 const {authMode,setAuthMode,authName,setAuthName,authGender,setAuthGender,authEmail,setAuthEmail,authUsername,setAuthUsername,authPassword,setAuthPassword,authConfirmPassword,setAuthConfirmPassword,authMsg,setAuthMsg,stayLoggedIn,setStayLoggedIn,busy,signIn,signInWithGoogle,signUp,resetPassword,updatePassword,resendConfirmation}=p;
 const mode=authMode==='choice'?'signin':authMode;
 const isSignin=mode==='signin', isSignup=mode==='signup', isForgot=mode==='forgot', isUpdatePassword=mode==='update-password';
 const showTabs=isSignin||isSignup;
 const submit=isSignup?signUp:isForgot?resetPassword:isUpdatePassword?updatePassword:signIn;
 const theme='light';
 const [style]=useState(initialStyle);
 const [unStatus,setUnStatus]=useState('idle');
 const go=m=>{setAuthMode(m);setAuthMsg('')};
 const two=style===2;
 const headline=['Make','room','for','what','matters.'];
 const title=two?(isSignup?'Create your account':isForgot?'Reset your password':isUpdatePassword?'Choose a new password':'Welcome back'):(isSignup?'Create your Pocket':isForgot?'Reset your password':isUpdatePassword?'Choose a new password':'Sign in');
 const subtitle=isSignup?'A clearer view of your money starts with one small step.':isForgot?'We’ll send you a secure link to reset your password.':isUpdatePassword?'Choose a strong password you have not used before.':two?'Sign in to pick up where you left off.':'Welcome back to your Pocket.';
 const ok=/check your email|link has been sent|created successfully|confirmation email has been sent|account created/i.test(authMsg||'');
 let n=0;const i=()=>({'--i':n++});
 const showGoogle=!isForgot&&!isUpdatePassword;

 const googleBtn=<button type="button" className="lg-google" onClick={signInWithGoogle} disabled={busy} style={i()}>{GOOGLE}<span>Continue with Google</span></button>;
 const orRow=<div className="lg-or" style={i()}><span/>or<span/></div>;
 const fields=<>
  {isSignup&&<>
   <label className="lg-field" style={i()}><span>Full name<em className="req" aria-hidden="true"> *</em></span><input autoComplete="name" required value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="What should we call you?"/></label>
   <fieldset className="lg-field lg-gender" style={i()}><legend>Gender</legend><div className="lg-pills">{[{value:'female',label:'Female'},{value:'male',label:'Male'},{value:'prefer_not_to_say',label:'Prefer not to say'}].map(g=><button key={g.value} type="button" className={authGender===g.value?'on':''} aria-pressed={authGender===g.value} onClick={()=>setAuthGender(g.value)}>{authGender===g.value&&<Check size={14}/>}{g.label}</button>)}</div><small>Used to personalize suggested transaction categories. You can change it later in Account &amp; Profile.</small></fieldset>
  </>}
  {isSignup&&<label className="lg-field" style={i()}><span>Username<em className="req" aria-hidden="true"> *</em></span><input autoComplete="username" required minLength={3} maxLength={32} value={authUsername} onChange={e=>setAuthUsername(e.target.value)} placeholder="e.g. nora.m"/><UsernameStatus value={authUsername} onStatus={setUnStatus}/></label>}
  {!isUpdatePassword&&<label className="lg-field" style={i()}><span>{isSignin?'Email or username':isSignup?'Email address (optional)':'Email address'}</span><input type={isSignin?'text':'email'} autoComplete={isSignin?'username':'email'} required={!isSignup} value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com"/></label>}
  {!isForgot&&<label className="lg-field" style={i()}><span>{isUpdatePassword?'New password':'Password'}{(isSignup||isUpdatePassword)&&<em className="req" aria-hidden="true"> *</em>}</span><PasswordInput autoComplete={isSignup||isUpdatePassword?'new-password':'current-password'} minLength={isSignup||isUpdatePassword?10:1} required value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder={isSignup||isUpdatePassword?'At least 10 characters':'Enter your password'}/>{(isSignup||isUpdatePassword)&&<PasswordRules value={authPassword}/>}</label>}
  {isUpdatePassword&&<label className="lg-field" style={i()}><span>Confirm new password<em className="req" aria-hidden="true"> *</em></span><PasswordInput autoComplete="new-password" minLength={10} required value={authConfirmPassword} onChange={e=>setAuthConfirmPassword(e.target.value)} placeholder="Enter the new password again"/></label>}
  {isSignin&&<div className="lg-options" style={i()}><label className="lg-check"><input type="checkbox" checked={stayLoggedIn} onChange={e=>setStayLoggedIn(e.target.checked)}/><span>Stay logged in</span></label><button type="button" className="lg-link" onClick={()=>go('forgot')}>Forgot password?</button></div>}
 </>;
 const submitBtn=<button className="lg-submit" type="submit" disabled={busy||((isSignup||isUpdatePassword)&&!passwordOk(authPassword))||(isSignup&&(unStatus!=='ok'&&unStatus!=='error'))} style={i()}>{busy?<LoaderCircle size={18} className="spin"/>:null}<span>{busy?'Please wait…':isSignup?'Create account':isForgot?'Send reset link':isUpdatePassword?'Update password':two?'Continue':'Sign in'}</span>{!busy&&!two&&<ArrowUpRight size={17} className="lg-submit-arrow" aria-hidden="true"/>}</button>;
 const messages=<>
  {authMsg&&<p className={`lg-msg ${ok?'ok':'bad'}`} role="status">{authMsg}</p>}
  {isSignin&&/not confirmed|confirmation email|confirm your email/i.test(authMsg||'')&&<button type="button" className="lg-link lg-resend" onClick={resendConfirmation} disabled={busy}>{busy?'Sending…':'Resend confirmation email'}</button>}
 </>;
 const form=<form className="lg-form" key={`f-${mode}-${style}`} onSubmit={submit}>
  {two&&showGoogle&&<>{googleBtn}{orRow}</>}
  {fields}
  {submitBtn}
  {!two&&showGoogle&&<>{orRow}{googleBtn}</>}
  {messages}
 </form>;
 const switchRow=(isForgot||isSignin||isSignup)&&<p className="lg-switch" style={i()}>{isForgot?<>Remembered your password? <button type="button" className="lg-link" onClick={()=>go('signin')}>Back to sign in</button></>:isSignup?<>{two?'Have an account?':'Already have a Pocket account?'} <button type="button" className="lg-link" onClick={()=>go('signin')}>{two?'Log in':'Sign in'}</button></>:<>New to Pocket? <button type="button" className="lg-link" onClick={()=>go('signup')}>Create an account</button></>}</p>;

 if(two) return <main className="lg-page lg2" data-lg-theme={theme}>
  <div className="lg2-blobs" aria-hidden="true"><i/><i/><i/></div>
  <div className="lg-brand lg2-brand"><img src="/brand/pocket-mark.svg" alt=""/><span>Pocket</span></div>
  <div className="lg2-art lg2-art-left" aria-hidden="true">
   <ArtCard className="o1" style={{'--d':0}}/><ArtCalendar className="o2" style={{'--d':2}}/><ArtCoins className="o3" style={{'--d':4}}/>
  </div>
  <div className="lg2-art lg2-art-right" aria-hidden="true">
   <ArtNote className="o4" style={{'--d':1}}/><ArtGoal className="o5" style={{'--d':3}}/><ArtReceipt className="o6" style={{'--d':5}}/>
  </div>
  <section className="lg2-center">
   <div className="lg-form-head" key={`h-${mode}`}><h1 style={i()}>{title}</h1><p style={i()}>{subtitle}</p></div>
   {form}
   {switchRow}
   <div className="lg2-features" style={i()}>
    <p>Everything money, in one calm place</p>
    <ul><li><Landmark size={15}/>Accounts</li><li><CreditCard size={15}/>Cards</li><li><CalendarClock size={15}/>Bills</li><li><Car size={15}/>Vehicles</li><li><Target size={15}/>Goals</li></ul>
   </div>
   <p className="lg-secure lg2-secure"><LockKeyhole size={13}/> Secure sign-in keeps your financial workspace private.</p>
  </section>
 </main>;

 return <main className="lg-page" data-lg-theme={theme}>
  <div className="lg-bg" aria-hidden="true"><i className="r1"/><i className="r2"/></div>
  <section className="lg-hero">
   <div className="lg-brand"><img src="/brand/pocket-mark.svg" alt=""/><span>Pocket</span></div>
   <div className="lg-hero-body">
    <h2 className="lg-headline" aria-label="Make room for what matters.">{headline.slice(0,3).map((w,k)=><span key={k} className="lg-word" style={{'--w':k}} aria-hidden="true">{w}</span>)}<span className="lg-accent-group" aria-hidden="true">{headline.slice(3).map((w,k)=><span key={k} className="lg-word lg-accent" style={{'--w':k+3}}>{w}</span>)}</span></h2>
    <p className="lg-lead">One clear view of your money, goals and everyday decisions.</p>
    <div className="lg-collage" aria-hidden="true">
     <div className="lg-preview">
      <div className="lg-preview-top"><span className="lg-preview-title"><span className="lg-preview-icon"><CreditCard size={19}/></span>Next payment</span><span className="lg-chip">In 19 days</span></div>
      <div className="lg-preview-amount"><AnimatedNumber value="EGP 6,200" duration={1400}/></div>
      <div className="lg-bar"><i/></div>
      <div className="lg-preview-foot"><span>EGP 51,050 available</span><span>EGP 8,950 used of EGP 60,000</span></div>
     </div>
     <div className="lg-float f1"><span className="lg-float-ic ok"><ArrowDownLeft size={16}/></span><span><b>Salary received</b><small>+EGP 42,000</small></span></div>
     <div className="lg-float f2"><span className="lg-float-ic warn"><CalendarClock size={16}/></span><span><b>Rent due</b><small>in 3 days</small></span></div>
     <div className="lg-float f3"><span className="lg-float-ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="var(--line)" strokeWidth="5"/><circle cx="18" cy="18" r="14" fill="none" stroke="#32b98a" strokeWidth="5" strokeLinecap="round" strokeDasharray="59.8 88" transform="rotate(-90 18 18)"/></svg></span><span><b>Emergency fund</b><small>68% reached</small></span></div>
    </div>
   </div>
   <p className="lg-secure"><LockKeyhole size={13}/> Secure sign-in keeps your financial workspace private.</p>
  </section>
  <section className="lg-side">
   <div className="lg-card" key={showTabs?'tabs':mode}>
    {showTabs&&<div className="lg-tabs" role="tablist" data-active={isSignup?'signup':'signin'}>
     <span className="lg-tab-pill" aria-hidden="true"/>
     <button type="button" role="tab" aria-selected={isSignin} className={isSignin?'on':''} onClick={()=>go('signin')}>Sign in</button>
     <button type="button" role="tab" aria-selected={isSignup} className={isSignup?'on':''} onClick={()=>go('signup')}>Create account</button>
    </div>}
    <div className="lg-form-head" key={mode}><h1 style={i()}>{title}</h1><p style={i()}>{subtitle}</p></div>
    {form}
    {switchRow}
   </div>
   <p className="lg-secure lg-secure-mobile"><LockKeyhole size={13}/> Secure sign-in keeps your financial workspace private.</p>
  </section>
 </main>;
}
