import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { EXAMPLES, parseChat, rememberCategory } from '../../lib/chatParser.js';

const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const money = (n, c) => { try { return new Intl.NumberFormat('en-EG', { style: 'currency', currency: c || 'EGP', maximumFractionDigits: 2 }).format(Number(n) || 0); } catch { return String(n); } };

function Draft({ m, ctx, onChange, onSave, onCancel }) {
  const d = m.draft;
  const set = patch => onChange({ ...d, ...patch, catChanged: d.catChanged || 'category' in patch });
  const { accounts, goals, currency, expenseCats, incomeCats } = ctx;
  const usable = accounts.filter(a => !a.is_system && !/^goals$/i.test(a.name));
  const withGoals = accounts.filter(a => !['Credit card', 'Installment app'].includes(a.type));
  const goalsAccId = accounts.find(a => a.is_system === true)?.id;
  const goalsInvolved = d.kind === 'transfer' && goalsAccId && [d.accountId, d.toAccountId].some(x => String(x) === String(goalsAccId));
  const acct = (value, key, label) => <label className="chat-field"><span>{label}</span><select value={value || ''} onChange={e => set({ [key]: e.target.value })}>{!value && <option value="">Choose…</option>}{(d.kind === 'transfer' ? withGoals : usable).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>;
  const amountField = <label className="chat-field"><span>Amount</span><input inputMode="decimal" value={d.amount ?? ''} onChange={e => set({ amount: e.target.value.replace(/[^0-9.]/g, '') })} /></label>;
  const title = { expense: 'Expense', income: 'Income', transfer: 'Transfer', debt: 'Debt payment', bill: 'Bill payment', goal: 'Goal deposit' }[d.kind];
  const saved = m.status === 'saved';
  return <div className={`chat-card ${saved ? 'is-saved' : ''}`}>
    <div className="chat-card-head"><span>{saved ? 'Saved' : 'Check before saving'}</span><b className={`chat-chip chat-chip-${d.kind}`}>{title}</b></div>
    <div className="chat-amount">{money(d.amount, currency)}</div>
    {(d.kind === 'debt') && <p className="chat-note">{d.debtName}</p>}
    {(d.kind === 'bill') && <p className="chat-note">{d.billName}</p>}
    {!saved && <div className="chat-fields">
      {(d.kind === 'expense' || d.kind === 'income') && <div className="chat-seg" role="group" aria-label="Type">{['Expense', 'Income'].map(t => <button key={t} type="button" aria-pressed={d.type === t} className={d.type === t ? 'on' : ''} onClick={() => set({ type: t, kind: t.toLowerCase(), category: (t === 'Income' ? incomeCats : expenseCats).includes(d.category) ? d.category : (t === 'Income' ? 'Other income' : 'Other') })}>{t}</button>)}</div>}
      {amountField}
      {(d.kind === 'expense' || d.kind === 'income') && <label className="chat-field"><span>Category</span><select value={d.category} onChange={e => set({ category: e.target.value })}>{(d.type === 'Income' ? incomeCats : expenseCats).map(c => <option key={c}>{c}</option>)}</select></label>}
      {(d.kind === 'expense' || d.kind === 'income') && <label className="chat-field"><span>Note</span><input value={d.description || ''} onChange={e => set({ description: e.target.value })} /></label>}
      {d.kind === 'goal' && <label className="chat-field"><span>Goal</span><select value={d.goalId || ''} onChange={e => set({ goalId: e.target.value })}>{!d.goalId && <option value="">Choose a goal…</option>}{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}
      {acct(d.accountId, 'accountId', d.kind === 'transfer' || d.kind === 'goal' ? 'From account' : d.kind === 'income' ? 'Into account' : 'Pay from')}
      {d.kind === 'transfer' && <label className="chat-field"><span>To account</span><select value={d.toAccountId || ''} onChange={e => set({ toAccountId: e.target.value })}>{!d.toAccountId && <option value="">Choose…</option>}{withGoals.filter(a => String(a.id) !== String(d.accountId)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
      {d.kind === 'transfer' && goalsInvolved && <label className="chat-field"><span>Which goal?</span><select value={d.goalId || ''} onChange={e => set({ goalId: e.target.value })}>{!d.goalId && <option value="">Choose a goal…</option>}{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}
      <label className="chat-field"><span>Date</span><input type="date" value={d.date} max={todayISO()} onChange={e => set({ date: e.target.value })} /></label>
    </div>}
    {!saved && <div className="chat-actions">
      <button type="button" className="chat-btn chat-btn-primary" disabled={m.status === 'saving'} onClick={onSave}>{m.status === 'saving' ? 'Saving…' : 'Save'}</button>
      <button type="button" className="chat-btn" onClick={onCancel}>Cancel</button>
    </div>}
    {m.status === 'failed' && <p className="chat-note chat-note-bad">Not saved. Read the message at the top, fix it, and try again.</p>}
  </div>;
}

export function ChatSheet({ accounts, debts, recurring, goals, expenseCats, incomeCats, currency, defaultAccountId, onSave }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);
  const bodyRef = useRef(null); const inputRef = useRef(null);
  const ctx = useMemo(() => ({ accounts, debts, recurring, goals, expenseCats, incomeCats, currency, defaultAccountId }), [accounts, debts, recurring, goals, expenseCats, incomeCats, currency, defaultAccountId]);
  useEffect(() => { if (open) { setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);
  useEffect(() => { const b = bodyRef.current; if (!b) return; const last = b.lastElementChild; b.scrollTop = last ? Math.max(0, last.offsetTop - 8) : 0; }, [msgs, open]);
  useEffect(() => { if (!open) return; const k = e => { if (e.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open]);

  const [vv, setVv] = useState(null);
  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const v = window.visualViewport;
    const fit = () => { if (window.innerWidth > 680) { setVv(null); return; } setVv({ bottom: Math.max(0, window.innerHeight - v.offsetTop - v.height), height: Math.min(window.innerHeight * 0.88, v.height - 8) }); };
    fit(); v.addEventListener('resize', fit); v.addEventListener('scroll', fit);
    return () => { v.removeEventListener('resize', fit); v.removeEventListener('scroll', fit); };
  }, [open]);

  const push = m => setMsgs(old => [...old, { id: Math.random().toString(36).slice(2), ...m }]);
  const patch = (id, p) => setMsgs(old => old.map(m => m.id === id ? { ...m, ...p } : m));

  function send(value) {
    const raw = (value ?? text).trim(); if (!raw) return;
    setText('');
    push({ from: 'me', text: raw });
    if (!accounts.some(a => !a.is_system)) { push({ from: 'bot', text: 'Add an account or wallet first (Accounts → Add account), then I can add transactions for you.' }); return; }
    const r = parseChat(raw, { accounts, debts, recurring, goals, expenseCats, incomeCats, defaultAccountId, today: todayISO() });
    if (r.error) { push({ from: 'bot', text: r.error === 'amount' ? 'I could not find an amount. Try: صرفت 200 على أكل' : 'Type what you spent or received.' }); return; }
    push({ from: 'bot', draft: r, status: 'draft' });
  }

  async function save(m) {
    const d = m.draft;
    if (!(Number(d.amount) > 0)) { patch(m.id, { status: 'failed' }); return; }
    patch(m.id, { status: 'saving' });
    let ok = false;
    try { ok = await onSave({ ...d, amount: Number(d.amount) }); } catch { ok = false; }
    if (ok && d.catChanged && d.category && (d.kind === 'expense' || d.kind === 'income')) rememberCategory(d.description || d.rawText, d.category, d.type);
    patch(m.id, { status: ok ? 'saved' : 'failed' });
  }

  return <>
    {!open && <button type="button" className="chat-fab" onClick={() => setOpen(true)} aria-label="Add by typing"><MessageCircle size={20} aria-hidden="true" /><span>Add by typing</span></button>}
    {open && <div className="chat-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
    {open && <section className="chat-sheet" role="dialog" aria-label="Add by typing" style={vv ? { bottom: vv.bottom, height: vv.height } : undefined}>
      <header className="chat-head"><h2>Add by typing</h2><button type="button" className="chat-x" onClick={() => setOpen(false)} aria-label="Close"><X size={18} aria-hidden="true" /></button></header>
      <div className="chat-body" ref={bodyRef}>
        {!msgs.length && <div className="chat-empty"><p>Type what you spent or got. Pocket fills the details and asks you to confirm.</p><div className="chat-ex">{EXAMPLES.map(x => <button key={x} type="button" onClick={() => send(x)}>{x}</button>)}</div></div>}
        {msgs.map(m => m.from === 'me'
          ? <div key={m.id} className="chat-me">{m.text}</div>
          : m.draft
            ? <Draft key={m.id} m={m} ctx={ctx} onChange={d => patch(m.id, { draft: d })} onSave={() => save(m)} onCancel={() => setMsgs(old => old.filter(x => x.id !== m.id))} />
            : <div key={m.id} className="chat-bot">{m.text}</div>)}
      </div>
      <form className="chat-input" onSubmit={e => { e.preventDefault(); send(); }}>
        <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} placeholder="صرفت 200 على أكل" aria-label="Message" autoComplete="off" />
        <button type="submit" className="chat-send" aria-label="Send"><Send size={18} aria-hidden="true" /></button>
      </form>
    </section>}
  </>;
}
