import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { AccessRequestsPage } from './AccessRequestsPage.jsx';
import { AdminAccessPage } from './AdminAccessPage.jsx';
import { useState } from 'react';
import { ModalShell } from '../../components/modals/ModalShell.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { Send } from '../../lib/icons.jsx';

// Owner: one message to every user. Each user gets it in their Inbox.
function BroadcastModal({ supabase, count, onClose, onToast }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function send() {
    if (!text.trim()) { setErr('Write your message first.'); return; }
    setBusy(true); setErr('');
    const { data, error } = await supabase.rpc('support_broadcast', { p_message: text.trim() });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onToast?.(`Sent to ${data} user${data === 1 ? '' : 's'}. It shows in their Inbox.`); onClose();
  }
  return <ModalShell title="Message all users" subtitle={`Every user (${count}) gets this in their Inbox and can reply to you.`} onClose={onClose}>
    <div className="form-grid">
      <Field label="Message" wide hint="Owners and admins do not get it."><textarea className="pocket-textarea" rows="6" maxLength={4000} value={text} onChange={e => setText(e.target.value)} placeholder="Hi! We just added…" /></Field>
    </div>
    {err && <p className="cc-error" role="alert">{err}</p>}
    <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy} onClick={send}>{busy ? 'Sending…' : `Send to ${count} users`}</button></div>
  </ModalShell>;
}

export function AccessManagementPage({supabase,onToast,users,loading,profile,onUpdate,onDelete,onCreate,onRefresh,initialTab='requests'}){
  const [bcOpen,setBcOpen]=useState(false);
  const userCount=(users||[]).filter(u=>u.role==='user').length;
  return <div className="page-content access-management-workspace">
    <PageHeading eyebrow="ADMINISTRATION" title={initialTab==='users'?'Users':'Requests'} subtitle={initialTab==='users'?'Manage user accounts, roles, and workspace feature permissions.':'Review access requests and grant workspace permissions.'} actions={initialTab==='users'&&<button type="button" className="btn btn-primary" onClick={()=>setBcOpen(true)}><Send size={16}/> Message all users</button>}/>
    {initialTab==='requests'?<AccessRequestsPage supabase={supabase} onToast={onToast}/>:<AdminAccessPage users={users} loading={loading} profile={profile} onUpdate={onUpdate} onDelete={onDelete} onCreate={onCreate} onRefresh={onRefresh}/>}
    {bcOpen&&<BroadcastModal supabase={supabase} count={userCount} onClose={()=>setBcOpen(false)} onToast={onToast}/>}
  </div>;
}
