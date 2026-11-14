import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Inbox, Send, ArrowLeft, Plus } from '../../lib/icons.jsx';
import { ContactModal } from './HelpPage.jsx';

// Inbox: conversations between users and the Pocket team.
// A user sees their own conversations; an Owner sees everyone's, with the user's details, and replies here.
// Built from design-system pieces: PageHeading, Tabs, panel, EmptyState, buttons, Field-style textarea.
const TOPIC = { problem: 'Something is wrong', plus: 'Plus & payment', idea: 'An idea', other: 'Something else' };
const when = v => {
  const d = new Date(v), now = new Date();
  return d.toDateString() === now.toDateString() ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
export const threadUnread = (t, isOwner) => isOwner
  ? !t.last_from_owner && (!t.owner_read_at || new Date(t.last_at) > new Date(t.owner_read_at))
  : t.last_from_owner && new Date(t.last_at) > new Date(t.user_read_at);

export function InboxPage({ supabase, session, isOwner = false, users = [], fromPage = '', onToast, onChanged }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('all');
  const [newOpen, setNewOpen] = useState(false);
  const endRef = useRef(null);
  const userOf = id => users.find(x => String(x.user_id ?? x.id) === String(id)) || null;
  const nameOf = id => { const u = userOf(id); return u ? (u.username || u.full_name || u.email || 'User') : 'User'; };

  const load = useCallback(async () => {
    const { data } = await supabase.from('support_messages').select('*').order('last_at', { ascending: false }).limit(200);
    setThreads(data || []); setLoading(false); onChanged?.();
  }, [supabase]);
  useEffect(() => { load(); const iv = setInterval(() => { if (!document.hidden) load(); }, 20000); return () => clearInterval(iv); }, [load]);

  const open = threads.find(t => t.id === openId) || null;
  const loadMsgs = useCallback(async id => {
    const { data } = await supabase.from('support_replies').select('*').eq('thread_id', id).order('created_at');
    setMsgs(data || []);
    await supabase.rpc('support_mark_read', { p_thread: id });
    setThreads(o => o.map(t => t.id === id ? { ...t, [isOwner ? 'owner_read_at' : 'user_read_at']: new Date().toISOString() } : t)); onChanged?.();
  }, [supabase, isOwner]);
  useEffect(() => { if (openId) loadMsgs(openId); }, [openId, loadMsgs]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs, openId]);

  async function reply() {
    const body = text.trim(); if (!body || !open) return;
    setBusy(true);
    const { data, error } = await supabase.from('support_replies').insert({ thread_id: open.id, sender_id: session.user.id, from_owner: isOwner, body }).select().single();
    setBusy(false);
    if (error) { onToast?.('Could not send. Try again.'); return; }
    setMsgs(o => [...o, data]); setText('');
    setThreads(o => o.map(t => t.id === open.id ? { ...t, last_at: data.created_at, last_from_owner: isOwner, status: isOwner ? 'replied' : 'new' } : t).sort((a, b) => new Date(b.last_at) - new Date(a.last_at)));
  }

  const list = useMemo(() => threads.filter(t => tab === 'all' || (tab === 'unread' ? threadUnread(t, isOwner) : t.status === tab)), [threads, tab, isOwner]);
  const unread = threads.filter(t => threadUnread(t, isOwner)).length;
  const lastText = t => t.last_from_owner ? (isOwner ? 'You replied' : 'Pocket team replied') : (isOwner ? t.message : 'You: ' + t.message);

  const conv = open && [{ id: 'first', body: open.message, from_owner: false, created_at: open.created_at }, ...msgs];
  const u = open ? userOf(open.user_id) : null;

  return <div className="inbox-page">
    <PageHeading eyebrow={isOwner ? 'SUPPORT' : 'MESSAGES'} title="Inbox" subtitle={isOwner ? 'Messages from Pocket users. Your reply shows in their Inbox.' : 'Your messages with the Pocket team.'}
      actions={!isOwner && <button type="button" className="btn btn-primary" onClick={() => setNewOpen(true)}><Plus size={16} /> New message</button>} />
    <div className={`inbox-layout ${open ? 'has-open' : ''}`}>
      <section className="panel inbox-list" aria-label="Conversations">
        {isOwner && <Tabs label="Filter" value={tab} onChange={setTab} items={[{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread', count: unread }, { key: 'new', label: 'To answer' }, { key: 'replied', label: 'Answered' }]} />}
        {loading ? <p className="small-muted inbox-pad">Loading…</p> : !list.length
          ? <EmptyState inline icon={Inbox} title={isOwner ? 'No messages' : 'No messages yet'} text={isOwner ? 'New messages from users show up here.' : 'Questions or problems? Send us a message and our reply shows up here.'} action={isOwner ? null : () => setNewOpen(true)} actionLabel="New message" />
          : list.map(t => <button type="button" key={t.id} className={`inbox-row ${t.id === openId ? 'on' : ''} ${threadUnread(t, isOwner) ? 'unread' : ''}`} onClick={() => setOpenId(t.id)}>
            <span className="inbox-avatar" aria-hidden="true">{(isOwner ? nameOf(t.user_id) : 'P').slice(0, 1).toUpperCase()}</span>
            <span className="inbox-row-t"><span className="inbox-row-top"><b>{isOwner ? nameOf(t.user_id) : (TOPIC[t.topic] || 'Message')}</b><small>{when(t.last_at)}</small></span>
              {isOwner && <small className="inbox-row-topic">{TOPIC[t.topic] || 'Message'}</small>}
              <small className="inbox-row-last">{lastText(t)}</small></span>
            {threadUnread(t, isOwner) && <i className="inbox-dot" aria-label="Unread" />}
          </button>)}
      </section>
      <section className="panel inbox-thread" aria-label="Conversation">
        {!open ? <EmptyState inline icon={Inbox} title="Pick a conversation" text="Choose a message on the left to read it and reply." />
          : <>
            <div className="inbox-thread-head">
              <button type="button" className="icon-btn inbox-back" aria-label="Back to messages" onClick={() => setOpenId(null)}><ArrowLeft size={18} /></button>
              <div><b>{isOwner ? nameOf(open.user_id) : (TOPIC[open.topic] || 'Message')}</b><small>{isOwner ? `${TOPIC[open.topic] || 'Message'} · started ${when(open.created_at)}` : `Started ${when(open.created_at)}`}</small></div>
              <span className={`sms-pill ${open.status === 'replied' ? 'on' : 'warn'}`}>{open.status === 'replied' ? 'Answered' : isOwner ? 'To answer' : 'Waiting'}</span>
            </div>
            {isOwner && <div className="inbox-user">
              {[['Name', u?.full_name || [u?.first_name, u?.last_name].filter(Boolean).join(' ')], ['Email', u?.email && !/@users\.pocket\.local$/.test(u.email) ? u.email : ''], ['Username', u?.username], ['Sent from', open.page], ['Device', open.device], ['User ID', open.user_id]].filter(([, v]) => v).map(([k, v]) => <div key={k}><small>{k}</small><span>{v}</span></div>)}
            </div>}
            <div className="inbox-msgs">
              {conv.map(m => { const mine = m.from_owner === isOwner; return <div key={m.id} className={`inbox-msg ${mine ? 'mine' : 'theirs'}`}>
                <small>{m.from_owner ? (isOwner ? 'You' : 'Pocket team') : (isOwner ? nameOf(open.user_id) : 'You')} · {when(m.created_at)}</small>
                <p>{m.body}</p>
              </div>; })}
              <div ref={endRef} />
            </div>
            <div className="inbox-compose">
              <textarea className="pocket-textarea" rows="2" maxLength={4000} value={text} onChange={e => setText(e.target.value)} placeholder={isOwner ? 'Write your reply…' : 'Write a message…'} aria-label="Message"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) reply(); }} />
              <button type="button" className="btn btn-primary" disabled={busy || !text.trim()} onClick={reply} aria-label="Send"><Send size={16} /> Send</button>
            </div>
          </>}
      </section>
    </div>
    {newOpen && <ContactModal supabase={supabase} userEmail={session?.user?.email || ''} fromPage={fromPage} onClose={() => setNewOpen(false)} onSent={() => { setNewOpen(false); onToast?.('Message sent. Our reply shows up here in your Inbox.'); load(); }} />}
  </div>;
}
