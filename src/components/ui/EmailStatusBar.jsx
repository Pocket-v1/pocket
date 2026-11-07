import { LoaderCircle, Mail, MailWarning, X } from 'lucide-react';
import { useState } from 'react';

/* Slim status bar shown to any signed-in user whose account has no email, or whose email is not verified yet. */
export function EmailStatusBar({user,onAddEmail,onSendVerification,onDismiss}){
 const [busy,setBusy]=useState(false);const [sent,setSent]=useState(false);
 const email=user?.email||'';
 const hasEmail=Boolean(email)&&!email.endsWith('@users.pocket.local');
 const verified=hasEmail&&Boolean(user?.email_confirmed_at);
 if(!user||verified)return null;
 const send=async()=>{setBusy(true);const ok=await onSendVerification?.();setBusy(false);if(ok)setSent(true);};
return <div className="email-status-wrap"><div className={`email-status-bar ${hasEmail?'is-unverified':'is-missing'}`} role="status">
  <span className="email-status-bar-icon" aria-hidden="true">{hasEmail?<MailWarning size={18}/>:<Mail size={18}/>}</span>
  <div className="email-status-bar-copy"><b>{hasEmail?'Verify your email':'Add an email to your account'}</b><span>{hasEmail?<>Confirm <em>{email}</em> so you can recover your account.</>:'Without an email you can’t reset your password.'}</span></div>
  {hasEmail
   ?<button type="button" className="btn btn-secondary btn-sm" onClick={send} disabled={busy||sent}>{busy?<LoaderCircle size={14} className="spin"/>:<Mail size={14}/>}{sent?'Email sent':'Send verification email'}</button>
   :<button type="button" className="btn btn-secondary btn-sm" onClick={onAddEmail}><Mail size={14}/>Add email</button>}
  <button type="button" className="icon-btn email-status-bar-close" onClick={onDismiss} aria-label="Dismiss"><X size={16}/></button>
 </div></div>;
}
