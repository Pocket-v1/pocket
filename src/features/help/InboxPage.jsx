import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Inbox, Send, ArrowLeft, Plus, UserRound } from '../../lib/icons.jsx';
import { ContactModal } from './HelpPage.jsx';
import { ShotPicker, SupportShot, uploadSupportShot, ReviewModal, StarsLine } from './supportFiles.jsx';

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
  const [shot, setShot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('all');
  const [newOpen, setNewOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const endRef = useRef(null);
  const userOf = id => users.find(x => String(x.user_id ?? x.id) === String(id)) || null;
  const nameOf = id => { const u = userOf(id); return u ? (u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email || 'User') : 'User'; };

  const load = useCallback(async () => {
    const { data } = await supabase.from('support_messages').select('*').order('last_at', { ascending: false }).limit(200);
    setThreads(data || []); setLoading(false); onChanged?.();
  }, [supabase]);

  const open = threads.find(t => t.id === openId) || null;
  const openRef = useRef(null); openRef.current = openId;
  const seenRef = useRef({});
  const loadMsgs = useCallback(async (id, mark = false) => {
    const { data } = await supabase.from('support_replies').select('*').eq('thread_id', id).order('created_at');
    if (openRef.current !== id) return;
    const rows = data || [];
    setMsgs(o => (o.length === rows.length && o[o.length - 1]?.id === rows[rows.length - 1]?.id ? o : rows));
    const fromOther = rows.filter(m => m.from_owner !== isOwner).length;
    if (mark || fromOther > (seenRef.current[id] ?? fromOther)) {
      await supabase.rpc('support_mark_read', { p_thread: id });
      setThreads(o => o.map(t => t.id === id ? { ...t, [isOwner ? 'owner_read_at' : 'user_read_at']: new Date().toISOString() } : t)); onChanged?.();
    }
    seenRef.current[id] = fromOther;
  }, [supabase, isOwner]);
  useEffect(() => { if (openId) loadMsgs(openId, true); }, [openId, loadMsgs]);
  // Live: refresh every 3 seconds, and right away when Pocket hears of a change.
  useEffect(() => {
    load();
    const tick = () => { if (document.hidden) return; load(); if (openRef.current) loadMsgs(openRef.current); };
    const iv = setInterval(tick, 3000);
    window.addEventListener('pocket-inbox-changed', tick);
    return () => { clearInterval(iv); window.removeEventListener('pocket-inbox-changed', tick); };
  }, [load, loadMsgs]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs, openId]);

  async function reply() {
    const body = text.trim() || (shot ? 'Screenshot' : ''); if (!body || !open) return;
    setBusy(true);
    let attachment_path = null;
    try { if (shot) attachment_path = await uploadSupportShot(supabase, open.user_id, shot); } catch (e) { setBusy(false); onToast?.(e.message); return; }
    const { data, error } = await supabase.from('support_replies').insert({ thread_id: open.id, sender_id: session.user.id, from_owner: isOwner, body, attachment_path }).select().single();
    setBusy(false);
    if (error) { onToast?.('Could not send. Try again.'); return; }
    setMsgs(o => [...o, data]); setText(''); setShot(null);
    setThreads(o => o.map(t => t.id === open.id ? { ...t, last_at: data.created_at, last_from_owner: isOwner, status: isOwner ? 'replied' : 'new' } : t).sort((a, b) => new Date(b.last_at) - new Date(a.last_at)));
  }

  async function closeChat(reopen) {
    setBusy(true);
    const { error } = await supabase.rpc('support_close', { p_thread: open.id, p_open: !!reopen });
    setBusy(false);
    if (error) { onToast?.('Could not update the chat.'); return; }
    onToast?.(reopen ? 'Chat reopened.' : 'Chat ended. The user is asked to rate it.');
    load();
  }

  const list = useMemo(() => threads.filter(t => (tab === 'all' ? (!isOwner || t.status !== 'closed') : false) || (tab === 'unread' ? threadUnread(t, isOwner) : t.status === tab)), [threads, tab, isOwner]);
  const unread = threads.filter(t => threadUnread(t, isOwner)).length;
  const lastText = t => t.started_by_owner && t.last_from_owner && t.last_at === t.created_at ? (isOwner ? 'You: ' + t.message : t.message) : t.last_from_owner ? (isOwner ? 'You replied' : 'Pocket team replied') : (isOwner ? t.message : 'You: ' + t.message);

  const conv = open && [{ id: 'first', body: open.message, from_owner: !!open.started_by_owner, created_at: open.created_at, attachment_path: open.attachment_path }, ...msgs];
  const u = open ? userOf(open.user_id) : null;

  return <div className="inbox-page">
    <PageHeading eyebrow={isOwner ? 'SUPPORT' : 'MESSAGES'} title="Inbox" subtitle={isOwner ? 'Messages from Pocket users. Your reply shows in their Inbox.' : 'Your messages with the Pocket team.'}
      actions={!isOwner && <button type="button" className="btn btn-primary" onClick={() => setNewOpen(true)}><Plus size={16} /> New message</button>} />
    {isOwner && <div className={`inbox-tabs ${open ? 'has-open' : ''}`}><Tabs label="Filter" value={tab} onChange={setTab} items={[{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread', count: unread }, { key: 'new', label: 'To answer' }, { key: 'replied', label: 'Answered' }, { key: 'closed', label: 'Closed' }]} /></div>}
    <div className={`inbox-layout ${open ? 'has-open' : ''}`}>
      <section className="panel inbox-list" aria-label="Conversations">
        {loading ? <p className="small-muted inbox-pad">Loading…</p> : !list.length
          ? <EmptyState inline icon={Inbox} title={isOwner ? 'No messages' : 'No messages yet'} text={isOwner ? 'New messages from users show up here.' : 'Questions or problems? Send us a message and our reply shows up here.'} action={isOwner ? null : () => setNewOpen(true)} actionLabel="New message" />
          : list.map(t => <button type="button" key={t.id} className={`inbox-row ${t.id === openId ? 'on' : ''} ${threadUnread(t, isOwner) ? 'unread' : ''}`} onClick={() => setOpenId(t.id)}>
            <span className="inbox-avatar" aria-hidden="true">{isOwner ? <UserRound size={18} /> : <Inbox size={18} />}</span>
            <span className="inbox-row-t"><span className="inbox-row-top"><b>{isOwner ? nameOf(t.user_id) : t.started_by_owner ? 'Pocket team' : (TOPIC[t.topic] || 'Message')}</b><small>{when(t.last_at)}</small></span>
              {isOwner && <small className="inbox-row-topic">{t.started_by_owner ? 'Message to all users' : (TOPIC[t.topic] || 'Message')}</small>}
              <small className="inbox-row-last">{lastText(t)}</small></span>
            {threadUnread(t, isOwner) && <i className="inbox-dot" aria-label="Unread" />}
          </button>)}
      </section>
      <section className="panel inbox-thread" aria-label="Conversation">
        {!open ? <EmptyState inline icon={Inbox} title="Pick a conversation" text="Choose a message on the left to read it and reply." />
          : <>
            <div className="inbox-thread-head">
              <button type="button" className="icon-btn inbox-back" aria-label="Back to messages" onClick={() => setOpenId(null)}><ArrowLeft size={18} /></button>
              <div><b>{isOwner ? nameOf(open.user_id) : open.started_by_owner ? 'Pocket team' : (TOPIC[open.topic] || 'Message')}</b><small>{isOwner ? `${TOPIC[open.topic] || 'Message'} · started ${when(open.created_at)}` : `Started ${when(open.created_at)}`}</small></div>
              <span className={`sms-pill ${open.status === 'closed' ? 'muted' : open.status === 'replied' ? 'on' : 'warn'}`}>{open.status === 'closed' ? 'Closed' : open.status === 'replied' ? 'Answered' : isOwner ? 'To answer' : 'Waiting'}</span>
              {isOwner && <button type="button" className="btn btn-secondary btn-sm inbox-end" disabled={busy} onClick={() => closeChat(open.status === 'closed')}>{open.status === 'closed' ? 'Reopen' : 'End chat'}</button>}
            </div>
            {isOwner && <div className="inbox-user">
              {[['Name', u?.full_name || [u?.first_name, u?.last_name].filter(Boolean).join(' ')], ['Email', u?.email && !/@users\.pocket\.local$/.test(u.email) ? u.email : ''], ['Username', u?.username], ['Sent from', open.page], ['Device', open.device], ['User ID', open.user_id]].filter(([, v]) => v).map(([k, v]) => <div key={k}><small>{k}</small><span>{v}</span></div>)}
            </div>}
            <div className="inbox-msgs">
              {conv.map(m => { const mine = m.from_owner === isOwner; return <div key={m.id} className={`inbox-msg ${mine ? 'mine' : 'theirs'}`}>
                <small>{m.from_owner ? (isOwner ? 'You' : 'Pocket team') : (isOwner ? nameOf(open.user_id) : 'You')} · {when(m.created_at)}</small>
                {m.body && !(m.attachment_path && m.body === 'Screenshot') && <p>{m.body}</p>}
                {m.attachment_path && <SupportShot supabase={supabase} path={m.attachment_path} />}
              </div>; })}
              <div ref={endRef} />
            </div>
            {open.status === 'closed' && <div className="inbox-closed">
              <div><b>{isOwner ? 'You ended this chat' : 'This chat was closed'}</b><small>{open.closed_at ? when(open.closed_at) : ''}{isOwner ? (open.rated_at ? ' · rated by the user' : ' · waiting for a review') : ''}</small></div>
              {open.rated_at ? <div className="inbox-review"><StarsLine value={open.rating} />{open.review && <p>“{open.review}”</p>}</div>
                : open.user_id === session?.user?.id && <button type="button" className="btn btn-primary btn-sm" onClick={() => setRateOpen(true)}>Rate this chat</button>}
            </div>}
            {(isOwner || open.status !== 'closed') && <div className="inbox-compose">
              <textarea className="pocket-textarea" rows="2" maxLength={4000} value={text} onChange={e => setText(e.target.value)} placeholder={isOwner ? 'Write your reply…' : 'Write a message…'} aria-label="Message"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) reply(); }} />
              <ShotPicker compact value={shot} onChange={setShot} />
              <button type="button" className="btn btn-primary" disabled={busy || (!text.trim() && !shot)} onClick={reply} aria-label="Send"><Send size={16} /> Send</button>
            </div>}
          </>}
      </section>
    </div>
    {rateOpen && open && <ReviewModal supabase={supabase} thread={open} onClose={() => setRateOpen(false)} onDone={() => { setRateOpen(false); onToast?.('Thank you for your review!'); load(); }} />}
    {newOpen && <ContactModal supabase={supabase} userEmail={session?.user?.email || ''} fromPage={fromPage} onClose={() => setNewOpen(false)} onSent={() => { setNewOpen(false); onToast?.('Message sent. Our reply shows up here in your Inbox.'); load(); }} />}
  </div>;
}
