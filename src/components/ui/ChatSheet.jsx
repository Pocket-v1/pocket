import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, X, Mic, Camera, ArrowUpRight } from '../../lib/icons.jsx';
import { rememberCategory } from '../../lib/chatParser.js';
import { parseMessage, draftNotes, PAGE_EXAMPLES } from '../../lib/chatIntents.js';

const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const money = (n, c) => { try { return new Intl.NumberFormat('en-EG', { style: 'currency', currency: c || 'EGP', maximumFractionDigits: 2 }).format(Number(n) || 0); } catch { return String(n); } };
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const FUEL_TYPES = ['80 Octane', '92 Octane', '95 Octane', '98 Octane', 'Diesel', 'Electric charging', 'Gas'];
const SERVICE_TYPES = ['Oil change', 'Routine maintenance', 'Tires', 'Brakes', 'Battery', 'Repair', 'Other'];
const TITLES = { expense: 'Expense', income: 'Income', transfer: 'Transfer', debt: 'Debt payment', bill: 'Bill payment', goal: 'Goal deposit', fuel: 'Fuel', service: 'Car service', budget: 'Budget', newbill: 'New monthly bill' };

function Draft({ m, ctx, onChange, onSave, onCancel }) {
  const d = m.draft;
  const set = patch => onChange({ ...d, ...patch, catChanged: d.catChanged || 'category' in patch });
  const { accounts, goals, currency, expenseCats, incomeCats, vehicles = [] } = ctx;
  const usable = accounts.filter(a => !a.is_system && !/^goals$/i.test(a.name));
  const withGoals = accounts.filter(a => !['Credit card', 'Installment app'].includes(a.type) && (!a.is_system || [d.accountId, d.toAccountId].some(x => String(x) === String(a.id))));
  const goalsAccId = accounts.find(a => a.is_system === true)?.id;
  const goalsInvolved = d.kind === 'transfer' && goalsAccId && [d.accountId, d.toAccountId].some(x => String(x) === String(goalsAccId));
  const acct = (value, key, label) => <label className="field"><span>{label}</span><select value={value || ''} onChange={e => set({ [key]: e.target.value })}>{!value && <option value="">Choose…</option>}{(d.kind === 'transfer' ? withGoals : usable).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>;
  const num = (key, label, ph) => <label className="field"><span>{label}</span><input inputMode="decimal" placeholder={ph} value={d[key] ?? ''} onChange={e => set({ [key]: e.target.value.replace(/[^0-9.]/g, '') })} /></label>;
  const txt = (key, label, ph) => <label className="field"><span>{label}</span><input placeholder={ph} value={d[key] || ''} onChange={e => set({ [key]: e.target.value })} /></label>;
  const isTx = d.kind === 'expense' || d.kind === 'income';
  const car = d.kind === 'fuel' || d.kind === 'service';
  const saved = m.status === 'saved';
  const notes = saved ? [] : draftNotes(d, ctx);
  const vehicle = vehicles.find(v => String(v.id) === String(d.vehicleId));
  return <div className={`chat-card ${saved ? 'is-saved' : ''}`}>
    <div className="chat-card-head"><span>{saved ? 'Saved' : 'Check before saving'}</span><b className={`chat-chip chat-chip-${car ? 'expense' : d.kind}`}>{TITLES[d.kind]}</b></div>
    <div className="chat-amount">{money(d.amount, currency)}{d.kind === 'budget' && <small> / month</small>}</div>
    {d.receiptUrl && <img className="chat-receipt-thumb" src={d.receiptUrl} alt="Receipt" />}
    {d.kind === 'debt' && <p className="chat-note">{d.debtName}</p>}
    {d.kind === 'bill' && <p className="chat-note">{d.billName}</p>}
    {notes.map((n, i) => <p key={i} className={`chat-note ${n.tone === 'bad' ? 'chat-note-bad' : 'chat-note-warn'}`}>{n.text}</p>)}
    {!saved && <div className="chat-fields">
      {isTx && <div className="chat-seg" role="group" aria-label="Type">{['Expense', 'Income'].map(t => <button key={t} type="button" aria-pressed={d.type === t} className={d.type === t ? 'on' : ''} onClick={() => set({ type: t, kind: t.toLowerCase(), category: (t === 'Income' ? incomeCats : expenseCats).includes(d.category) ? d.category : (t === 'Income' ? 'Other income' : 'Other') })}>{t}</button>)}</div>}
      {num('amount', d.kind === 'budget' ? 'Monthly limit' : d.kind === 'fuel' ? 'Total paid' : 'Amount', '0')}
      {(isTx || d.kind === 'budget' || d.kind === 'newbill') && <label className="field"><span>Category</span><select value={d.category} onChange={e => set({ category: e.target.value })}>{[...new Set([...(d.type === 'Income' ? incomeCats : expenseCats), d.category].filter(Boolean))].map(c => <option key={c}>{c}</option>)}</select></label>}
      {isTx && txt('description', 'Note', '')}
      {d.kind === 'newbill' && txt('name', 'Name', 'Internet')}
      {d.kind === 'newbill' && <label className="field"><span>Next due</span><input type="date" value={d.nextDue} onChange={e => set({ nextDue: e.target.value })} /></label>}
      {d.kind === 'budget' && <label className="field"><span>Month</span><input type="month" value={d.month} onChange={e => set({ month: e.target.value })} /></label>}
      {car && <label className="field"><span>Vehicle</span><select value={d.vehicleId || ''} onChange={e => set({ vehicleId: e.target.value })}>{!d.vehicleId && <option value="">Choose…</option>}{vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>}
      {d.kind === 'fuel' && <label className="field"><span>Fuel type</span><select value={d.fuelType} onChange={e => set({ fuelType: e.target.value })}>{FUEL_TYPES.map(f => <option key={f}>{f}</option>)}</select></label>}
      {d.kind === 'fuel' && num('liters', 'Liters', 'From the pump')}
      {d.kind === 'service' && txt('title', 'What was done', 'Oil change')}
      {d.kind === 'service' && <label className="field"><span>Type</span><select value={d.serviceType} onChange={e => set({ serviceType: e.target.value })}>{SERVICE_TYPES.map(f => <option key={f}>{f}</option>)}</select></label>}
      {car && num('odometer', 'Odometer', vehicle?.current_odometer != null ? `Last ${Number(vehicle.current_odometer).toLocaleString()}` : 'Reading')}
      {d.kind === 'goal' && <label className="field"><span>Goal</span><select value={d.goalId || ''} onChange={e => set({ goalId: e.target.value })}>{!d.goalId && <option value="">Choose a goal…</option>}{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}
      {d.kind !== 'budget' && acct(d.accountId, 'accountId', d.kind === 'transfer' || d.kind === 'goal' ? 'From account' : d.kind === 'income' ? 'Into account' : d.kind === 'newbill' ? 'Usually paid from' : 'Pay from')}
      {d.kind === 'transfer' && <label className="field"><span>To account</span><select value={d.toAccountId || ''} onChange={e => set({ toAccountId: e.target.value })}>{!d.toAccountId && <option value="">Choose…</option>}{withGoals.filter(a => String(a.id) !== String(d.accountId)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
      {d.kind === 'transfer' && goalsInvolved && <label className="field"><span>Which goal?</span><select value={d.goalId || ''} onChange={e => set({ goalId: e.target.value })}>{!d.goalId && <option value="">Choose a goal…</option>}{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}
      {d.kind !== 'budget' && d.kind !== 'newbill' && <label className="field"><span>Date</span><input type="date" value={d.date} max={todayISO()} onChange={e => set({ date: e.target.value })} /></label>}
    </div>}
    {!saved && <div className="chat-actions">
      <button type="button" className="btn btn-primary" disabled={m.status === 'saving'} onClick={onSave}>{m.status === 'saving' ? 'Saving…' : 'Save'}</button>
      <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
    </div>}
    {m.status === 'failed' && <p className="chat-note chat-note-bad">Not saved. Check the amount and the fields, then try again.</p>}
  </div>;
}

export function ChatSheet({ open: openProp, onOpenChange, accounts, debts, recurring, goals, expenseCats, incomeCats, currency, defaultAccountId, onSave, transactions = [], budgets = [], page, pages, onNavigate, vehicles = [], vehicleSpend, lastFuelType, startWith }) {
  const [openLocal, setOpenLocal] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openLocal;
  const setOpen = v => { const next = typeof v === 'function' ? v(open) : v; controlled ? onOpenChange?.(next) : setOpenLocal(next); };
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('pocket-voice-lang') || 'ar-EG'; } catch { return 'ar-EG'; } });
  const recRef = useRef(null); const fileRef = useRef(null);
  const bodyRef = useRef(null); const inputRef = useRef(null);
  const ctx = useMemo(() => ({ accounts, debts, recurring, goals, expenseCats, incomeCats, currency, defaultAccountId, transactions, budgets, page, pages, vehicles, vehicleSpend, lastFuelType }), [accounts, debts, recurring, goals, expenseCats, incomeCats, currency, defaultAccountId, transactions, budgets, page, pages, vehicles, vehicleSpend, lastFuelType]);
  const examples = PAGE_EXAMPLES[page] || PAGE_EXAMPLES.default;
  useEffect(() => { if (open && !startWith) { setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);
  useEffect(() => { if (!open || !startWith) return; if (startWith === 'voice') setTimeout(startVoice, 150); if (startWith === 'photo') setTimeout(() => fileRef.current?.click(), 50); }, [open, startWith]);
  useEffect(() => { const b = bodyRef.current; if (!b) return; const last = b.lastElementChild; b.scrollTop = last ? Math.max(0, last.offsetTop - 8) : 0; }, [msgs, open]);
  useEffect(() => { if (!open) return; const k = e => { if (e.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open]);
  useEffect(() => { if (!open) { try { recRef.current?.abort(); } catch { /* ignore */ } setListening(false); } }, [open]);

  const [vv, setVv] = useState(null);
  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const v = window.visualViewport;
    const fit = () => { if (window.innerWidth > 680) { setVv(null); return; } setVv({ bottom: Math.max(0, window.innerHeight - v.offsetTop - v.height), height: Math.min(window.innerHeight * 0.88, v.height - 8) }); };
    fit(); v.addEventListener('resize', fit); v.addEventListener('scroll', fit);
    return () => { v.removeEventListener('resize', fit); v.removeEventListener('scroll', fit); };
  }, [open]);

  const push = m => { const id = Math.random().toString(36).slice(2); setMsgs(old => [...old, { id, ...m }]); return id; };
  const patch = (id, p) => setMsgs(old => old.map(m => m.id === id ? { ...m, ...p } : m));

  function send(value) {
    const raw = (value ?? text).trim(); if (!raw) return;
    setText('');
    push({ from: 'me', text: raw });
    if (!accounts.some(a => !a.is_system)) { push({ from: 'bot', text: 'Add an account or wallet first (Accounts → Add account), then I can add things for you.' }); return; }
    const results = parseMessage(raw, { ...ctx, today: todayISO() });
    for (const r of results) {
      if (r.navigate) { push({ from: 'bot', text: `Opening ${r.navigate}.` }); setTimeout(() => { onNavigate?.(r.navigate); setOpen(false); }, 350); continue; }
      if (r.answer) { push({ from: 'bot', text: r.answer, page: r.page }); continue; }
      if (r.error) { push({ from: 'bot', text: r.error === 'amount' ? `I could not find an amount. Try: ${examples[0]}` : 'Type what you spent or received, or ask a question.' }); continue; }
      push({ from: 'bot', draft: r.draft, status: 'draft' });
    }
  }

  function startVoice() {
    if (!SR) return;
    if (listening) { try { recRef.current?.stop(); } catch { /* ignore */ } return; }
    const rec = new SR(); recRef.current = rec;
    rec.lang = lang; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    let finalText = '';
    rec.onresult = e => { let interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript; } setText((finalText + ' ' + interim).trim()); };
    rec.onerror = e => { setListening(false); if (e.error === 'not-allowed' || e.error === 'service-not-allowed') push({ from: 'bot', text: 'Pocket needs the microphone. Allow it in the browser settings, then tap the mic again.' }); else if (e.error === 'no-speech') push({ from: 'bot', text: 'I did not hear anything. Tap the mic and speak.' }); else if (e.error === 'network') push({ from: 'bot', text: 'Voice needs internet on this phone. Type instead, or try again when online.' }); };
    rec.onend = () => { setListening(false); setTimeout(() => inputRef.current?.focus(), 30); };
    try { rec.start(); setListening(true); setText(''); } catch { setListening(false); }
  }
  function toggleLang() { const next = lang === 'ar-EG' ? 'en-US' : 'ar-EG'; setLang(next); try { localStorage.setItem('pocket-voice-lang', next); } catch { /* ignore */ } }

  async function onPhoto(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    push({ from: 'me', image: url });
    const wait = push({ from: 'bot', text: 'Reading the receipt… (the first time takes a little longer)' });
    try {
      const { readReceipt } = await import('../../lib/receiptReader.js');
      const r = await readReceipt(file, p => patch(wait, { text: `Reading the receipt… ${p}%` }));
      setMsgs(old => old.filter(m => m.id !== wait));
      const guess = parseMessage(`صرفت 1 ${r.merchant || ''}`, { ...ctx, today: todayISO() })[0]?.draft;
      push({ from: 'bot', text: r.amount ? 'Here is what I read. Fix anything that looks wrong.' : 'I could not find the total. Type it in the card.' });
      push({ from: 'bot', status: 'draft', draft: { kind: 'expense', type: 'Expense', amount: r.amount ?? '', category: guess?.category || 'Other', description: r.merchant || 'Receipt', date: r.date || todayISO(), accountId: guess?.accountId || defaultAccountId || accounts.find(a => !a.is_system)?.id || '', receiptFile: r.blob, receiptUrl: url, rawText: r.merchant || '' } });
    } catch {
      setMsgs(old => old.filter(m => m.id !== wait));
      push({ from: 'bot', text: 'Could not read this photo. Try a clearer, flat photo in good light, or type the amount.' });
      push({ from: 'bot', status: 'draft', draft: { kind: 'expense', type: 'Expense', amount: '', category: 'Other', description: 'Receipt', date: todayISO(), accountId: defaultAccountId || accounts.find(a => !a.is_system)?.id || '', receiptFile: file, receiptUrl: url } });
    }
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
  const pending = msgs.filter(m => m.draft && (m.status === 'draft' || m.status === 'failed'));
  async function saveAll() { for (const m of pending) await save(m); }

  return <>
    {!open && !controlled && <button type="button" className="chat-fab" onClick={() => setOpen(true)} aria-label="Add by typing"><MessageCircle size={20} aria-hidden="true" /><span>Add by typing</span></button>}
    {open && <div className="chat-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
    {open && <section className="chat-sheet" role="dialog" aria-label="Pocket chat" style={vv ? { bottom: vv.bottom, height: vv.height } : undefined}>
      <header className="chat-head"><h2>Type, talk or snap</h2><button type="button" className="chat-x" onClick={() => setOpen(false)} aria-label="Close"><X size={18} aria-hidden="true" /></button></header>
      <div className="chat-body" ref={bodyRef}>
        {!msgs.length && <div className="chat-empty"><p>Type, speak or snap a receipt. Pocket fills the details and asks you to confirm. You can also ask questions or say “افتح الأهداف”.</p><div className="chat-ex">{examples.map(x => <button key={x} type="button" onClick={() => send(x)}>{x}</button>)}</div></div>}
        {msgs.map(m => m.from === 'me'
          ? (m.image ? <img key={m.id} className="chat-me-img" src={m.image} alt="Receipt photo" /> : <div key={m.id} className="chat-me">{m.text}</div>)
          : m.draft
            ? <Draft key={m.id} m={m} ctx={ctx} onChange={d => patch(m.id, { draft: d })} onSave={() => save(m)} onCancel={() => setMsgs(old => old.filter(x => x.id !== m.id))} />
            : <div key={m.id} className="chat-bot">{m.text}{m.page && onNavigate && <button type="button" className="chat-link" onClick={() => { onNavigate(m.page); setOpen(false); }}>Open {m.page} <ArrowUpRight size={13} aria-hidden="true" /></button>}</div>)}
        {pending.length > 1 && <div className="chat-saveall"><button type="button" className="btn btn-primary" onClick={saveAll}>Save all {pending.length}</button></div>}
      </div>
      <form className="chat-input" onSubmit={e => { e.preventDefault(); send(); }}>
        <button type="button" className="chat-tool" onClick={() => fileRef.current?.click()} aria-label="Snap a receipt"><Camera size={18} aria-hidden="true" /></button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
        <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} placeholder={listening ? (lang === 'ar-EG' ? 'اتكلم…' : 'Listening…') : examples[0]} aria-label="Message" autoComplete="off" />
        {SR && <button type="button" className="chat-lang" onClick={toggleLang} aria-label={`Voice language: ${lang === 'ar-EG' ? 'Arabic' : 'English'}`}>{lang === 'ar-EG' ? 'ع' : 'EN'}</button>}
        {SR && !text.trim() ? <button type="button" className={`chat-send ${listening ? 'is-listening' : ''}`} onClick={startVoice} aria-label={listening ? 'Stop listening' : 'Speak'} aria-pressed={listening}><Mic size={18} aria-hidden="true" /></button>
          : <button type="submit" className="chat-send" aria-label="Send"><Send size={18} aria-hidden="true" /></button>}
      </form>
    </section>}
  </>;
}
