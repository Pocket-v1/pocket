import { createPortal } from 'react-dom';
import { MetricCard } from '../../components/ui/MetricCard.jsx';
import { ArrowLeftRight, BarChart3, Check, ChevronDown, Copy, Inbox, History, MessageSquare, Pencil, RefreshCw, RotateCcw, Search, Settings2, X, Clock, CheckCircle2, Download, Eye, EyeOff, FileSpreadsheet, FileText, Plus, Scissors, Trash2, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Field } from '../../components/ui/Field.jsx';
import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { getExpenseCategories, incomeCategories } from '../../lib/categories.js';
import { localISODate } from '../../lib/format.js';
import { isGoalsAccount } from '../../lib/features.js';
import { accountFlows, money } from '../../lib/credit.js';
import { exportTable } from '../../lib/transferFile.js';
import { MenuButton } from '../../components/ui/MenuButton.jsx';
import { buildAmountPattern, detectCurrency, findBalance, findLast4, matchAccount, normalizeDigits, parseSms } from '../../lib/smsParser.js';
import { BANKS } from '../../lib/smsBanks.js';
import { confidence, detectTransfers, groupsByMerchant, merchantKey, suggestAuto } from '../../lib/smsInsights.js';
import { SmsInsights } from './SmsInsights.jsx';
import { DailyCheck, SmsDevices, SmsRulesBackup } from './SmsDevices.jsx';

const TEST_SENDER = 'Pocket Test';
const csv = v => String(v || '').split(/[,\n،]/).map(x => x.trim()).filter(Boolean);
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('');
const copy = async (text, setToast) => { try { await navigator.clipboard.writeText(text); setToast?.('Copied'); } catch { setToast?.('Could not copy — select and copy manually'); } };

function AccountConfig({ account, cfg, userId, supabase, onSaved, setToast, open, onToggle, categories }) {
  const [f, setF] = useState({ enabled: cfg?.enabled ?? true, senders: (cfg?.senders || []).join(', '), card_last4: (cfg?.card_last4 || []).join(', '), default_category: cfg?.default_category || '', debit_keywords: (cfg?.debit_keywords || []).join(', '), credit_keywords: (cfg?.credit_keywords || []).join(', '), amount_pattern: cfg?.amount_pattern || '' });
  const [rules, setRules] = useState(cfg?.auto_rules || []);
  const [sample, setSample] = useState({ body: '', amt: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));
  const save = async () => {
    if (f.amount_pattern) { try { new RegExp(f.amount_pattern); } catch { setToast('Amount pattern is not a valid regex'); return; } }
    setBusy(true);
    const row = { account_id: account.id, user_id: userId, enabled: f.enabled, senders: csv(f.senders), card_last4: csv(f.card_last4).map(x => x.replace(/\D/g, '').slice(-4)).filter(x => x.length === 4), default_category: f.default_category || null, debit_keywords: csv(f.debit_keywords), credit_keywords: csv(f.credit_keywords), amount_pattern: f.amount_pattern.trim() || null, auto_rules: rules.filter(r => String(r.merchant || '').trim() && Number(r.max) > 0).map(r => ({ merchant: String(r.merchant).trim(), max: Number(r.max) })), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('account_sms_config').upsert(row, { onConflict: 'account_id' }).select().single();
    setBusy(false);
    if (error) { setToast(error.message); return; }
    onSaved(data); setToast(`SMS settings saved for ${account.name}`);
  };
  const configured = cfg && (cfg.senders?.length || cfg.card_last4?.length);
  return <div className={`sms-acc ${open ? 'open' : ''}`}>
    <button type="button" className="sms-acc-head" onClick={onToggle} aria-expanded={open}><span><b>{account.name}</b><small>{configured ? `${(cfg.senders || []).join(', ') || '—'}${cfg.card_last4?.length ? ` · •••• ${cfg.card_last4.join(', ')}` : ''}` : 'Not set up'}</small></span><span className={`sms-pill ${configured && cfg.enabled ? "on" : ""}`}>{configured ? (cfg.enabled ? 'On' : 'Off') : 'Off'}</span><ChevronDown size={16} /></button>
    {open && <div className="sms-acc-body">
      <label className="sms-toggle"><input type="checkbox" checked={f.enabled} onChange={e => set('enabled', e.target.checked)} /> <span>Read bank SMS for this account</span></label>
      <div className="sms-quick"><small>Quick setup — pick your bank</small><div>{BANKS.map(b => <button type="button" key={b.name} className="sms-chipbtn" onClick={() => { setF(o => ({ ...o, senders: b.senders.join(', '), debit_keywords: b.debit.join(', '), credit_keywords: b.credit.join(', ') })); }}>{b.name}</button>)}</div><small>Fills the sender and keywords. Check the sender name against a real SMS, then Save.</small></div>
      <div className="form-grid">
        <Field label="Bank sender name(s)" wide><input value={f.senders} onChange={e => set('senders', e.target.value)} placeholder="CIB, NBE, +201234…" /></Field>
        <Field label="Card / account last 4"><input inputMode="numeric" value={f.card_last4} onChange={e => set('card_last4', e.target.value)} placeholder="1234" /></Field>
        <Field label="Default category"><select value={f.default_category} onChange={e => set('default_category', e.target.value)}><option value="">Choose when approving</option>{categories.map(c => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <details className="sms-adv"><summary><Settings2 size={14} /> Parsing rules (optional)</summary>
        <div className="form-grid">
          <Field label="Words that mean money out" wide><input value={f.debit_keywords} onChange={e => set('debit_keywords', e.target.value)} placeholder="purchase, سحب, خصم" /></Field>
          <Field label="Words that mean money in" wide><input value={f.credit_keywords} onChange={e => set('credit_keywords', e.target.value)} placeholder="credited, ايداع, راتب" /></Field>
          <Field label="Custom amount pattern (regex, first group = amount)" wide><input value={f.amount_pattern} onChange={e => set('amount_pattern', e.target.value)} placeholder="Amt:\s*([\d,.]+)" /></Field>
        </div>
        <div className="sms-helper"><b>Pattern helper</b><small>Paste one SMS from this bank and type the amount as you see it. Pocket builds the pattern for you.</small>
          <textarea rows={3} dir="auto" value={sample.body} onChange={e => setSample(o => ({ ...o, body: e.target.value }))} placeholder="Paste a sample SMS" />
          <div className="sms-helper-row"><input inputMode="decimal" value={sample.amt} onChange={e => setSample(o => ({ ...o, amt: e.target.value }))} placeholder="Amount in the SMS, e.g. 450.00" /><button type="button" className="btn btn-sm" onClick={() => { const pat = buildAmountPattern(sample.body, sample.amt); if (!pat) { setToast('Could not find that amount in the SMS'); return; } set('amount_pattern', pat); setToast('Pattern created. Press Save to keep it.'); }}>Build pattern</button></div>
        </div>
      </details>
      <div className="sms-rules"><b>Auto-approve</b><small>Messages from these merchants are added to Transactions by themselves, up to the limit. Works when this page is open.</small>
        {rules.map((r, i) => <div className="sms-rule" key={i}><input value={r.merchant} onChange={e => setRules(o => o.map((x, j) => j === i ? { ...x, merchant: e.target.value } : x))} placeholder="Merchant, e.g. Uber" /><input inputMode="decimal" value={r.max} onChange={e => setRules(o => o.map((x, j) => j === i ? { ...x, max: e.target.value } : x))} placeholder="Up to" /><button type="button" className="icon-btn" aria-label="Remove rule" onClick={() => setRules(o => o.filter((_, j) => j !== i))}><Trash2 size={15} /></button></div>)}
        <button type="button" className="btn btn-sm" onClick={() => setRules(o => [...o, { merchant: '', max: '' }])}><Plus size={14} /> Add rule</button></div>
      <div className="sms-actions"><button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></div>
    </div>}
  </div>;
}

const ago = d => { if (!d) return 'No SMS yet'; const m = Math.round((Date.now() - new Date(d).getTime()) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
const mapPending = (x, cfgs, memo) => {
  const cfg = x.account_id ? cfgs.find(k => k.account_id === x.account_id) : matchAccount(cfgs, x.sender, findLast4(normalizeDigits(x.body)));
  return { ...x, account_id: x.account_id || cfg?.account_id || null, _type: x.txn_type || 'Expense', _amount: x.amount ?? '', _cat: x.category || memo[String(x.merchant || '').trim().toLowerCase()] || cfg?.default_category || '', _desc: x.merchant || '', _acc: x.account_id || cfg?.account_id || '' };
};
const isNoise = x => x.amount == null && !x.txn_type;

function SmsCard({ payTargets = [], conf, sug, onAutoRule, xfer, onTransfer, cur, x, usable, expCats, currency, fmt, patch, onApprove, onDismiss, onRemember, editing, setEditing, selectMode, selected, onSelect, dup, bal }) {
  const [open, setOpen] = useState(false);
  const accName = usable.find(a => String(a.id) === String(x._acc))?.name;
  const isIn = x._type === 'Income';
  const amt = Number(x._amount);
  const last4 = findLast4(normalizeDigits(x.body));
  const cats = isIn ? incomeCategories : expCats;
  const splits = x._splits || null;
  const splitSum = splits ? splits.reduce((n, r) => n + (Number(r.amount) || 0), 0) : 0;
  const remain = amt - splitSum;
  const startEdit = () => { patch(x.id, { _snap: { _type: x._type, _amount: x._amount, _acc: x._acc, _cat: x._cat, _desc: x._desc, _splits: x._splits || null, _to: x._to || '', _pay: x._pay || '' } }); setEditing(x.id, true); };
  const cancelEdit = () => { if (x._snap) patch(x.id, { ...x._snap, _snap: null }); setEditing(x.id, false); };
  const setSplit = (i, k, v) => patch(x.id, { _splits: splits.map((r, j) => j === i ? { ...r, [k]: v } : r) });
  const [dx, setDx] = useState(0);
  const [gone, setGone] = useState(0);
  const drag = useRef(null);
  const [hint] = useState(() => { try { return !localStorage.getItem('pocket.smsSwipeHint'); } catch { return false; } });
  const onDown = e => { if (editing || selectMode || e.button > 0 || e.target.closest('select,input,button,textarea,a,summary,.smx-quote')) return; drag.current = { x: e.clientX, y: e.clientY, on: false }; };
  const onMove = e => { const d = drag.current; if (!d) return; const mx = e.clientX - d.x; if (!d.on) { if (Math.abs(e.clientY - d.y) > 12 && Math.abs(mx) < 12) { drag.current = null; return; } if (Math.abs(mx) < 8) return; d.on = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } } setDx(Math.max(-170, Math.min(170, mx))); };
  const onUp = async () => { const d = drag.current; drag.current = null; if (!d || !d.on) return; const v = dx; if (v > 90) { setGone(1); setDx(0); const ok = await onApprove(x); if (ok === false) setGone(0); } else if (v < -90) { setGone(-1); setDx(0); await onDismiss(x); } else setDx(0); try { localStorage.setItem('pocket.smsSwipeHint', '1'); } catch { /* ignore */ } };
  const mode = dx > 6 ? 'ap' : dx < -6 ? 'di' : '';
  return <div className={`smx-swipe ${mode} ${gone > 0 ? 'gone-r' : gone < 0 ? 'gone-l' : ''}`}><div className="smx-bg ap" aria-hidden="true"><Check size={18} /> Approve</div><div className="smx-bg di" aria-hidden="true">Dismiss <X size={18} /></div>
  <article onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={dx ? { transform: `translateX(${dx}px)`, transition: 'none' } : undefined} className={`smx-card ${isIn ? 'in' : 'out'} ${editing ? 'editing' : ''} ${selected ? 'picked' : ''} ${hint ? 'smx-hint' : ''}`}>
    <div className="smx-meta">
      {selectMode && <input type="checkbox" className="smx-check" checked={!!selected} onChange={() => onSelect(x.id)} aria-label="Select this SMS" />}
      <span className="smx-av" aria-hidden="true">{(x.sender || '?').trim().charAt(0).toUpperCase()}</span>
      <small>{x.sender || 'Unknown sender'} · {new Date(x.received_at).toLocaleString()}</small>
      {conf && <span className={`smx-conf ${conf.level}`} title={conf.why.join(' · ')}>{conf.level === 'sure' ? '✓ Sure' : '! Check this'}</span>}
    </div>
    <div className="smx-hero"><div className={`smx-big ${isIn ? 'in' : 'out'}`}>{amt > 0 ? (cur ? `${isIn ? '+' : '−'}${cur} ${amt}` : `${isIn ? '+' : '−'}${fmt(amt)}`) : 'No amount'}</div>{x._desc && <b className="smx-title">{x._desc}</b>}</div>
    {!editing ? <div className="smx-quick"><label><small>Account</small><select value={x._acc} onChange={e => patch(x.id, { _acc: e.target.value })}><option value="">Choose…</option>{usable.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>{x._type === 'Transfer' ? <label><small>To account</small><select value={x._to || ''} onChange={e => patch(x.id, { _to: e.target.value })}><option value="">Choose…</option>{usable.filter(a => String(a.id) !== String(x._acc)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label> : splits ? <span className="smx-chip">Split in {splits.length}</span> : <label><small>Category</small><select value={x._cat} onChange={e => patch(x.id, { _cat: e.target.value })}><option value="">{isIn ? 'Other income' : 'Other'}</option>{cats.map(c => <option key={c}>{c}</option>)}</select></label>}</div> : <div className="form-grid smx-edit">
      <Field label="Type"><select value={x._type} onChange={e => patch(x.id, { _type: e.target.value, _cat: '', _splits: null, _to: '', _pay: '' })}><option>Expense</option><option>Income</option><option>Transfer</option></select></Field>
      <Field label={`Amount (${currency})`}><input inputMode="decimal" value={x._amount} onChange={e => patch(x.id, { _amount: e.target.value })} /></Field>
      <Field label="Account"><select value={x._acc} onChange={e => patch(x.id, { _acc: e.target.value })}><option value="">Choose…</option>{usable.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
      {x._type === 'Expense' && payTargets.length > 0 && <Field label="Use it to pay" wide><select value={x._pay || ''} onChange={e => patch(x.id, { _pay: e.target.value })}><option value="">Just an expense</option>{payTargets.some(t => t.kind === 'debt') && <optgroup label="Debts and installments">{payTargets.filter(t => t.kind === 'debt').map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>}{payTargets.some(t => t.kind === 'bill') && <optgroup label="Bills and subscriptions">{payTargets.filter(t => t.kind === 'bill').map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>}</select></Field>}
      {x._type === 'Transfer' && <Field label="To account"><select value={x._to || ''} onChange={e => patch(x.id, { _to: e.target.value })}><option value="">Choose…</option>{usable.filter(a => String(a.id) !== String(x._acc)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
      {!splits && x._type !== 'Transfer' && <Field label="Category"><select value={x._cat} onChange={e => patch(x.id, { _cat: e.target.value })}><option value="">{isIn ? 'Other income' : 'Other'}</option>{cats.map(c => <option key={c}>{c}</option>)}</select></Field>}
      <Field label="Description" wide><input value={x._desc} onChange={e => patch(x.id, { _desc: e.target.value })} placeholder="Where was it?" /></Field>
      {splits && <div className="smx-splits wide">{splits.map((r, i) => <div className="smx-split" key={i}><select value={r.cat} onChange={e => setSplit(i, 'cat', e.target.value)} aria-label="Category"><option value="">{isIn ? 'Other income' : 'Other'}</option>{cats.map(c => <option key={c}>{c}</option>)}</select><input inputMode="decimal" value={r.amount} onChange={e => setSplit(i, 'amount', e.target.value)} placeholder="Amount" aria-label="Part amount" /><button type="button" className="icon-btn" aria-label="Remove part" onClick={() => patch(x.id, { _splits: splits.length > 2 ? splits.filter((_, j) => j !== i) : null })}><Trash2 size={15} /></button></div>)}
        <div className="smx-split-foot"><button type="button" className="btn btn-sm" onClick={() => patch(x.id, { _splits: [...splits, { cat: '', amount: remain > 0 ? String(Math.round(remain * 100) / 100) : '' }] })}><Plus size={14} /> Add part</button><small className={Math.abs(remain) < 0.01 ? 'ok' : 'bad'}>{Math.abs(remain) < 0.01 ? 'Parts add up' : remain > 0 ? `${fmt(remain)} left to assign` : `${fmt(-remain)} too much`}</small></div></div>}
      {!splits && amt > 0 && x._type !== 'Transfer' && <button type="button" className="sms-link smx-splitbtn" onClick={() => patch(x.id, { _splits: [{ cat: x._cat, amount: String(Math.round(amt / 2 * 100) / 100) }, { cat: '', amount: String(Math.round(amt / 2 * 100) / 100) }] })}><Scissors size={13} /> Split into categories</button>}
    </div>}
    {cur && <label className="smx-rate"><small>Exchange rate · 1 {cur} = ? {currency}</small><span><input inputMode="decimal" value={x._rate ?? ''} onChange={e => patch(x.id, { _rate: e.target.value })} placeholder="e.g. 50" aria-label="Exchange rate" /><b>{Number(x._rate) > 0 && amt > 0 ? `= ${fmt(Math.round(amt * Number(x._rate) * 100) / 100)}` : ''}</b></span></label>}
    {conf?.level === 'check' && <p className="smx-alert"><TriangleAlert size={14} /> {conf.why.join(' · ')}. Please confirm.</p>}
    {sug && <p className="smx-sug">Seen {sug.n}× as {x._cat || 'the same category'}. <button type="button" className="sms-link" onClick={() => onAutoRule(x, sug)}>Auto-approve {sug.merchant} up to {fmt(sug.max)}?</button></p>}
    {xfer && <p className="smx-xfer"><ArrowLeftRight size={14} /> Looks like a transfer with {xfer.sender || 'another bank'} ({fmt(Number(xfer._amount))}). <button type="button" className="sms-link" onClick={() => onTransfer(x, xfer)}>Add as one transfer</button></p>}
    <button type="button" className={`smx-quote ${open ? 'open' : ''}`} dir="auto" onClick={() => setOpen(o => !o)} aria-expanded={open}>{x.body}</button>
    {dup && <p className="smx-alert"><TriangleAlert size={14} /> Looks like “{dup.description || dup.category}” on {dup.transaction_date} is already in Transactions.</p>}
    {bal && <p className={`smx-bal ${bal.ok ? 'ok' : 'bad'}`}>{bal.ok ? `Balance matches the bank (${fmt(bal.sms)}) after adding this.` : `Bank says ${fmt(bal.sms)}, Pocket would show ${fmt(bal.expected)} (difference ${bal.diff > 0 ? '+' : '−'}${fmt(Math.abs(bal.diff))}).`}</p>}
    {!x.account_id && !editing && <p className="sms-warn">{x._acc ? <>Matched by guess. <button type="button" className="sms-link" onClick={() => onRemember(x)}>Remember {x.sender || 'this sender'}{last4 ? ` · ••${last4}` : ''} for {accName}</button></> : 'Choose the account above.'}</p>}
    {!x.account_id && editing && x._acc && <p className="sms-warn"><button type="button" className="sms-link" onClick={() => onRemember(x)}>Remember {x.sender || 'this sender'}{last4 ? ` · ••${last4}` : ''} for {accName}</button></p>}
    <div className="smx-tear" />
    <footer className="smx-foot">
      <button type="button" className="btn btn-sm" onClick={() => onDismiss(x)}><X size={14} /> Dismiss</button>
      <span className="smx-spacer" />
      {editing ? <button type="button" className="btn btn-sm" onClick={cancelEdit}>Cancel edit</button> : <button type="button" className="btn btn-sm" onClick={startEdit}><Pencil size={14} /> Edit</button>}
      <button type="button" className="btn btn-primary btn-sm" onClick={() => onApprove(x)}><Check size={14} /> Approve</button>
    </footer>
  </article></div>;
}

export function SmsPage({ debts = [], recurring = [], onPayDebt, onPayBill, accounts, transactions = [], session, supabase, currency = 'EGP', gender = '', onApprove, onUndoTx, onPendingChange, setToast }) {
  const userId = session?.user?.id;
  const [tab, setTabRaw] = useState('inbox');
  const [main, setMain] = useState('inbox');
  const [insOpen, setInsOpen] = useState(false);
  const setTab = k => { if (['inbox', 'insights', 'history'].includes(k)) setMain(k); setTabRaw(k); };
  const [items, setItems] = useState([]);
  const [hist, setHist] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [token, setToken] = useState('');
  const [lastSms, setLastSms] = useState(null);
  const [cstep, setCstep] = useState(1);
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState(false);
  const [devices, setDevices] = useState([]);
  const [mainSeen, setMainSeen] = useState(null);
  const [quiet, setQuietState] = useState(() => { try { return localStorage.getItem('pocket.smsQuiet') === '1'; } catch { return false; } });
  const setQuiet = v => { setQuietState(v); try { localStorage.setItem('pocket.smsQuiet', v ? '1' : '0'); } catch { /* ignore */ } };
  const savedF = (() => { try { return JSON.parse(localStorage.getItem('pocket.smsFilter') || 'null'); } catch { return null; } })();
  const [view, setView] = useState(savedF?.view || 'all');
  const [minAmt, setMinAmt] = useState(savedF?.minAmt || 0);
  const [range, setRange] = useState(savedF?.range || 'all');
  const [rates, setRates] = useState({});
  const [showTok, setShowTok] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openAcc, setOpenAcc] = useState(null);
  const [editingIds, setEditingIds] = useState({});
  const [selectMode, setSelectMode] = useState(false);
  const [sel, setSel] = useState([]);
  const [bulk, setBulk] = useState({ cat: '', acc: '' });
  const [fAcc, setFAcc] = useState('');
  const [q, setQ] = useState('');
  const [hStatus, setHStatus] = useState('all');
  const [hFrom, setHFrom] = useState('');
  const [platform, setPlatform] = useState(/android/i.test(navigator.userAgent) ? 'android' : 'iphone');
  const [test, setTest] = useState({ sender: '', body: '' });
  const usable = useMemo(() => accounts.filter(a => !isGoalsAccount(a)), [accounts]);
  const expCats = useMemo(() => getExpenseCategories(gender), [gender]);
  const fmt = useMemo(() => money(currency, 2), [currency]);
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co'}/functions/v1/sms-ingest`;

  const load = useCallback(async () => {
    setLoading(true);
    const dv = await supabase.from('sms_devices').select('*').order('created_at', { ascending: false });
    setDevices(dv.error ? [] : (dv.data || []));
    const [i, c, t, h] = await Promise.all([
      supabase.from('sms_inbox').select('*').eq('status', 'pending').order('received_at', { ascending: false }),
      supabase.from('account_sms_config').select('*'),
      supabase.from('sms_tokens').select('*').maybeSingle(),
      supabase.from('sms_inbox').select('*').in('status', ['approved', 'dismissed']).order('received_at', { ascending: false }).limit(300),
    ]);
    const hrows = (h.data || []).filter(r => r.sender !== TEST_SENDER);
    const memo = {}; hrows.filter(r => r.status === 'approved' && r.category).forEach(r => { const k = String(r.merchant || '').trim().toLowerCase(); if (k && !memo[k]) memo[k] = r.category; });
    const all = [...(i.data || []).filter(r => r.sender !== TEST_SENDER), ...hrows];
    setLastSms(all.reduce((m, r) => (!m || r.created_at > m ? r.created_at : m), null));
    if (i.error || c.error) { const e = i.error || c.error; setToast(e.message.includes('does not exist') ? 'SMS tables are not installed yet — run the SMS migration in Supabase first.' : e.message); }
    setItems((i.data || []).map(x => mapPending(x, c.data || [], memo)));
    setHist(hrows);
    setConfigs(c.data || []);
    setToken(t.data?.token || ''); setMainSeen(t.data?.last_seen_at || null);
    setLoading(false);
  }, [supabase, setToast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!loading && userId && !token) { const t = newToken(); supabase.from('sms_tokens').upsert({ user_id: userId, token: t }, { onConflict: 'user_id' }).then(({ error }) => { if (!error) setToken(t); }); } }, [loading, userId, token, supabase]);
  const live = useRef({ items: [], configs: [], hist: [] });
  live.current = { items, configs, hist };
  useEffect(() => {
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      const [dv, tk] = await Promise.all([supabase.from('sms_devices').select('*').order('created_at', { ascending: false }), supabase.from('sms_tokens').select('last_seen_at').maybeSingle()]);
      if (!dv.error && dv.data) setDevices(dv.data);
      if (!tk.error && tk.data) setMainSeen(tk.data.last_seen_at || null);
    };
    const id = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', refresh); };
  }, [supabase]);
  const poll = useCallback(async () => {
    const { data } = await supabase.from('sms_inbox').select('*').eq('status', 'pending').order('received_at', { ascending: false });
    if (!data) return;
    const have = new Set(live.current.items.map(x => x.id));
    const fresh = data.filter(x => !have.has(x.id) && x.sender !== TEST_SENDER);
    if (!fresh.length) return;
    const memo = {}; live.current.hist.filter(r => r.status === 'approved' && r.category).forEach(r => { const k = String(r.merchant || '').trim().toLowerCase(); if (k && !memo[k]) memo[k] = r.category; });
    const mapped = fresh.map(x => mapPending(x, live.current.configs, memo));
    setItems(o => [...mapped.filter(m => !o.some(y => y.id === m.id)), ...o]);
    setLastSms(new Date().toISOString());
    setToast(fresh.length === 1 ? 'New SMS arrived' : `${fresh.length} new SMS arrived`);
  }, [supabase, setToast]);
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') poll(); };
    const id = setInterval(tick, tab === 'connect' && !lastSms ? 5000 : 30000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick); };
  }, [poll, tab, lastSms]);
  const payments = useMemo(() => items.filter(x => !isNoise(x)), [items]);
  const noise = useMemo(() => items.filter(isNoise), [items]);
  useEffect(() => {
    if (!quiet || loading || !noise.length) return;
    const old = noise.filter(x => Date.now() - new Date(x.received_at).getTime() > 7 * 864e5);
    if (!old.length) return;
    supabase.from('sms_inbox').update({ status: 'dismissed' }).in('id', old.map(x => x.id)).then(() => { setItems(o => o.filter(y => !old.some(z => z.id === y.id))); setToast(`Cleared ${old.length} old OTP / offer message${old.length > 1 ? 's' : ''}`); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiet, loading, noise.length]);
  const foreign = useMemo(() => [...new Set(items.map(x => detectCurrency(x.body)).filter(c => c && c !== currency))], [items, currency]);
  useEffect(() => {
    foreign.filter(c => !rates[c]).forEach(async c => {
      try { const r = await fetch(`https://open.er-api.com/v6/latest/${c}`); const j = await r.json(); const v = j?.rates?.[currency]; if (v) setRates(o => ({ ...o, [c]: Math.round(v * 100) / 100 })); } catch { /* user types the rate */ }
    });
  }, [foreign, currency]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setItems(o => o.map(x => { const c = detectCurrency(x.body); return c && c !== currency && x._rate == null && rates[c] ? { ...x, _rate: String(rates[c]) } : x; })); }, [rates, currency]);
  useEffect(() => { onPendingChange?.(items.length); }, [items.length, onPendingChange]);

  const patch = (id, p) => setItems(o => o.map(x => x.id === id ? { ...x, ...p } : x));
  const setEditing = (id, v) => setEditingIds(o => ({ ...o, [id]: v }));
  const curOf = x => { const c = detectCurrency(x.body); return c && c !== currency ? c : null; };
  const payTargets = [
    ...debts.filter(d => Number(d.remaining_amount || 0) > 0).map(d => ({ kind: 'debt', key: `debt:${d.id}`, label: `${d.name} · ${fmt(d.monthly_payment || d.remaining_amount)}` })),
    ...recurring.filter(r => r.is_active !== false).map(r => ({ kind: 'bill', key: `bill:${r.id}`, label: `${r.name} · ${fmt(r.amount)}` })),
  ];
  const approve = async (x, opts = {}) => {
    const amount = Number(x._amount);
    if (!(amount > 0)) { setEditing(x.id, true); setToast('Enter the amount first'); return false; }
    if (!x._acc) { setEditing(x.id, true); setToast('Choose the account'); return false; }
    const cur = curOf(x); const rate = cur ? Number(x._rate) : 1;
    if (cur && !(rate > 0)) { setEditing(x.id, true); setToast(`Enter the ${cur} exchange rate`); return false; }
    const conv = v => Math.round(Number(v) * rate * 100) / 100;
    const parts = x._splits || null;
    if (parts && Math.abs(amount - parts.reduce((n, r) => n + (Number(r.amount) || 0), 0)) >= 0.01) { setEditing(x.id, true); setToast('The split parts must add up to the full amount'); return false; }
    const acc = accounts.find(a => String(a.id) === String(x._acc));
    if (x._type === 'Expense' && x._pay && !parts) {
      const [kind, id] = String(x._pay).split(':');
      let ok = false, label = '';
      if (kind === 'debt') { const d = debts.find(z => String(z.id) === id); if (d) { label = d.name; ok = await onPayDebt?.(d, { mode: 'transaction', amount: conv(amount), accountId: x._acc, paymentDate: localISODate(new Date(x.received_at)) }); } }
      else { const r = recurring.find(z => String(z.id) === id); if (r) { label = r.name; ok = await onPayBill?.(r, { accountId: x._acc, record: true, amount: conv(amount) }); } }
      if (!ok) return false;
      const pUpd = { status: 'approved', transaction_id: null, category: kind === 'debt' ? 'Debt repayment' : 'Bill', merchant: label, amount, txn_type: 'Expense', account_id: x._acc, edited: true, auto: !!opts.auto };
      await supabase.from('sms_inbox').update(pUpd).eq('id', x.id);
      setItems(o => o.filter(y => y.id !== x.id));
      setHist(o => [{ ...x, ...pUpd }, ...o]);
      setToast(`Paid ${label} with this SMS`);
      return true;
    }
    if (x._type === 'Transfer') {
      if (!x._to || String(x._to) === String(x._acc)) { setEditing(x.id, true); setToast('Choose the account the money went to'); return false; }
      const to = accounts.find(a => String(a.id) === String(x._to));
      const tLabel = x._desc && x._desc !== 'Transfer' ? x._desc : `Transfer · ${acc?.name} → ${to?.name}`;
      const tSaved = await onApprove({ transaction_date: localISODate(new Date(x.received_at)), type: 'Transfer', category: 'Transfer', subcategory: null, description: tLabel, amount: conv(amount), need_want: null, fixed_variable: 'Variable', payment_method: acc?.name || 'Unassigned', account_id: x._acc, to_account_id: x._to, goal_id: null, debt_id: null, recurring: false, notes: `From bank SMS: ${x.body}${cur ? ` | Original ${cur} ${amount} @ ${rate}` : ''}`.slice(0, 500) });
      if (!tSaved) return false;
      const tUpd = { status: 'approved', transaction_id: tSaved.id, category: 'Transfer', merchant: tLabel, amount, txn_type: x.txn_type || 'Expense', account_id: x._acc, edited: true, auto: !!opts.auto };
      await supabase.from('sms_inbox').update(tUpd).eq('id', x.id);
      setItems(o => o.filter(y => y.id !== x.id));
      setHist(o => [{ ...x, ...tUpd }, ...o]);
      if (!opts.bulk) showUndo({ x, ids: [tSaved.id], label: tLabel });
      return true;
    }
    const label0 = x._desc || (x.sender ? `SMS · ${x.sender}` : 'Bank SMS');
    const list = parts ? parts.map((r, i) => ({ cat: r.cat || (x._type === 'Income' ? 'Other income' : 'Other'), amount: conv(r.amount), label: `${label0} (${i + 1}/${parts.length})` })) : [{ cat: x._cat || (x._type === 'Income' ? 'Other income' : 'Other'), amount: conv(amount), label: label0 }];
    const note = `From bank SMS: ${x.body}${cur ? ` | Original ${cur} ${amount} @ ${rate}` : ''}`.slice(0, 500);
    const ids = [];
    for (const part of list) {
      const saved = await onApprove({ transaction_date: localISODate(new Date(x.received_at)), type: x._type, category: part.cat, subcategory: null, description: part.label, amount: part.amount, need_want: x._type === 'Expense' ? 'Need' : null, fixed_variable: 'Variable', payment_method: acc?.name || 'Unassigned', account_id: x._acc, to_account_id: null, goal_id: null, debt_id: null, recurring: false, notes: note });
      if (!saved) { if (ids.length && onUndoTx) await onUndoTx(ids); return false; }
      ids.push(saved.id);
    }
    const cat = list.length > 1 ? 'Split' : list[0].cat;
    const edited = Number(x.amount ?? 0) !== amount || (x.txn_type && x.txn_type !== x._type) || (x._desc || '') !== (x.merchant || '');
    const upd = { status: 'approved', transaction_id: ids[0], category: cat, merchant: x._desc || x.merchant || null, amount, txn_type: x._type, account_id: x._acc, edited: !!edited, auto: !!opts.auto };
    await supabase.from('sms_inbox').update(upd).eq('id', x.id);
    setItems(o => o.filter(y => y.id !== x.id));
    setHist(o => [{ ...x, ...upd }, ...o]);
    if (edited && !cur && Number(x.amount ?? 0) !== amount) learnAmount(x, amount);
    if (opts.auto) setToast(`Auto-approved ${label0}`);
    else if (!opts.bulk) showUndo({ x, ids, label: label0 });
    return true;
  };
  const learnAmount = async (x, amount) => {
    const pat = buildAmountPattern(x.body, String(amount)); if (!pat) return;
    const accId = x._acc; const cur = configs.find(c => String(c.account_id) === String(accId));
    if (cur?.amount_pattern) return;
    const last4 = findLast4(normalizeDigits(x.body));
    const entry = { kind: 'amount', pattern: pat, bank: x.sender || '', at: new Date().toISOString() };
    const row = { account_id: accId, user_id: userId, enabled: cur?.enabled ?? true, senders: cur?.senders?.length ? cur.senders : (x.sender ? [x.sender] : []), card_last4: cur?.card_last4?.length ? cur.card_last4 : (last4 ? [last4] : []), default_category: cur?.default_category || null, debit_keywords: cur?.debit_keywords || [], credit_keywords: cur?.credit_keywords || [], amount_pattern: pat, auto_rules: cur?.auto_rules || [], learned: [...(cur?.learned || []), entry].slice(-20), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('account_sms_config').upsert(row, { onConflict: 'account_id' }).select().single();
    if (!error && data) { setConfigs(o => [...o.filter(c => c.account_id !== data.account_id), data]); setToast('Learned how this bank writes amounts. Next one is read for you.'); }
  };
  const [undo, setUndo] = useState(null);
  const undoTimer = useRef(null);
  const showUndo = u => { clearTimeout(undoTimer.current); setUndo(u); undoTimer.current = setTimeout(() => setUndo(null), 6000); };
  const doUndo = async () => {
    const u = undo; if (!u) return; clearTimeout(undoTimer.current); setUndo(null);
    if (onUndoTx) await onUndoTx(u.ids);
    const { error } = await supabase.from('sms_inbox').update({ status: 'pending', transaction_id: null, edited: false, auto: false }).eq('id', u.x.id);
    if (error) { setToast(error.message); return; }
    setToast('Undone. Back in your Inbox.'); await load();
  };
  const approveAll = async () => { for (const x of shown.filter(y => y._acc && Number(y._amount) > 0)) await approve(x, { bulk: true }); setToast('Approved all ready SMS'); };
  const dismiss = async x => { await supabase.from('sms_inbox').update({ status: 'dismissed' }).eq('id', x.id); setItems(o => o.filter(y => y.id !== x.id)); setHist(o => [{ ...x, status: 'dismissed' }, ...o]); };
  const restore = async x => { const { error } = await supabase.from('sms_inbox').update({ status: 'pending' }).eq('id', x.id); if (error) { setToast(error.message); return; } setToast('Moved back to Inbox'); await load(); };
  const remember = async x => {
    const acc = accounts.find(a => String(a.id) === String(x._acc)); if (!acc) { setToast('Choose the account first'); return; }
    const cur = configs.find(c => c.account_id === acc.id);
    const last4 = findLast4(normalizeDigits(x.body));
    const senders = [...new Set([...(cur?.senders || []), ...(x.sender ? [x.sender] : [])])];
    const card_last4 = [...new Set([...(cur?.card_last4 || []), ...(last4 ? [last4] : [])])];
    const row = { account_id: acc.id, user_id: userId, enabled: true, senders, card_last4, default_category: cur?.default_category || null, debit_keywords: cur?.debit_keywords || [], credit_keywords: cur?.credit_keywords || [], amount_pattern: cur?.amount_pattern || null, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('account_sms_config').upsert(row, { onConflict: 'account_id' }).select().single();
    if (error) { setToast(error.message); return; }
    setConfigs(o => [...o.filter(c => c.account_id !== data.account_id), data]);
    setItems(o => o.map(y => y.id === x.id ? { ...y, account_id: acc.id } : y));
    setToast(`Next time, ${x.sender || 'this sender'} goes to ${acc.name} automatically`);
  };
  const sendTest = async () => {
    if (!token) { setToast('Create your token first'); return; }
    setTesting(true);
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, sender: TEST_SENDER, body: 'Test: card ending 0000 was charged EGP 1.00 at Pocket Test' }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { await supabase.from('sms_inbox').update({ status: 'dismissed' }).eq('sender', TEST_SENDER).eq('status', 'pending'); setToast('Test passed ✓ Pocket received it. It was not added to your Inbox.'); setTestOk(true); await load(); } else setToast(j.error || 'The test did not go through');
    } catch { setToast('Could not reach the SMS address'); }
    setTesting(false);
  };
  const makeToken = async () => {
    const t = newToken();
    const { error } = await supabase.from('sms_tokens').upsert({ user_id: userId, token: t }, { onConflict: 'user_id' });
    if (error) { setToast(error.message); return; }
    setToken(t); setToast(token ? 'New token created — update your phone automation' : 'Token created');
  };

  const needle = q.trim().toLowerCase();
  const hit = x => !needle || `${x.body} ${x.sender || ''} ${x._desc || x.merchant || ''}`.toLowerCase().includes(needle);
  const confMap = useMemo(() => Object.fromEntries(payments.map(x => [x.id, confidence(x, hist)])), [payments, hist]);
  const isReady = x => !!x._acc && Number(x._amount) > 0;
  const since = range === 'today' ? new Date(new Date().setHours(0, 0, 0, 0)) : range === 'week' ? new Date(Date.now() - 7 * 864e5) : range === 'month' ? new Date(new Date().getFullYear(), new Date().getMonth(), 1) : null;
  const shown = payments.filter(x => hit(x) && (!fAcc || (fAcc === 'none' ? !x._acc : String(x._acc) === String(fAcc))) && (view === 'all' || (view === 'check' ? confMap[x.id]?.level === 'check' : isReady(x))) && (!minAmt || Number(x._amount) >= minAmt) && (!since || new Date(x.received_at) >= since));
  const needsReview = payments.filter(x => confMap[x.id]?.level === 'check').length;
  const readyCount = payments.filter(isReady).length;
  const groups = groupsByMerchant(shown.filter(isReady));
  const xfers = useMemo(() => detectTransfers(payments), [payments]);
  const flagged = payments.filter(x => confMap[x.id]?.level === 'check').map(x => ({ ...x, _why: confMap[x.id].why }));
  const saveFilter = () => { try { localStorage.setItem('pocket.smsFilter', JSON.stringify({ view, minAmt, range })); setToast('Filter saved. It opens like this next time.'); } catch { /* ignore */ } };
  const approveGroup = async g => { for (const id of g.ids) { const x = items.find(y => y.id === id); if (x) await approve(x, { bulk: true }); } setToast(`Approved ${g.ids.length} ${g.label}`); };
  const addAutoRule = async (x, sug) => {
    const cur = configs.find(c => String(c.account_id) === String(x._acc)); if (!cur) { setToast('Link this bank to the account first'); return; }
    const row = { ...cur, auto_rules: [...(cur.auto_rules || []), { merchant: sug.merchant, max: sug.max }], updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('account_sms_config').upsert(row, { onConflict: 'account_id' }).select().single();
    if (error) { setToast(error.message); return; }
    setConfigs(o => [...o.filter(c => c.account_id !== data.account_id), data]); setToast(`Done. ${sug.merchant} up to ${fmt(sug.max)} is approved automatically.`);
  };
  const approveTransfer = async (a, b) => {
    const out = a._type === 'Expense' ? a : b; const inn = out === a ? b : a;
    if (!out._acc || !inn._acc || String(out._acc) === String(inn._acc)) { setToast('Choose two different accounts for this transfer'); return; }
    const amount = Number(out._amount); const from = accounts.find(z => String(z.id) === String(out._acc)); const to = accounts.find(z => String(z.id) === String(inn._acc));
    const saved = await onApprove({ transaction_date: localISODate(new Date(out.received_at)), type: 'Transfer', category: 'Transfer', subcategory: null, description: `Transfer · ${from?.name} → ${to?.name}`, amount, need_want: null, fixed_variable: 'Variable', payment_method: from?.name || 'Unassigned', account_id: out._acc, to_account_id: inn._acc, goal_id: null, debt_id: null, recurring: false, notes: `From bank SMS (both sides): ${out.body}`.slice(0, 500) });
    if (!saved) return;
    for (const x of [out, inn]) { const upd = { status: 'approved', transaction_id: saved.id, category: 'Transfer', merchant: 'Transfer', amount, txn_type: x._type, account_id: x._acc }; await supabase.from('sms_inbox').update(upd).eq('id', x.id); setHist(o => [{ ...x, ...upd }, ...o]); }
    setItems(o => o.filter(y => y.id !== out.id && y.id !== inn.id)); setToast('Added one transfer from both messages');
  };
  const histShown = hist.filter(x => hit(x) && (hStatus === 'all' || x.status === hStatus) && (!fAcc || String(x.account_id) === String(fAcc)) && (!hFrom || localISODate(new Date(x.received_at)) >= hFrom));
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const approvedMonth = hist.filter(x => x.status === 'approved' && new Date(x.received_at) >= monthStart).length;
  const dupFor = x => { const amt = Number(x._amount); if (!(amt > 0) || !x._acc) return null; const d = new Date(x.received_at).getTime(); return transactions.find(t => String(t.account_id) === String(x._acc) && t.type === x._type && Math.abs(Number(t.amount) - amt) < 0.005 && Math.abs(new Date(t.transaction_date).getTime() - d) <= 1.5 * 864e5) || null; };
  const balFor = x => { const sb = findBalance(x.body); const acc = usable.find(a => String(a.id) === String(x._acc)); const amt = Number(x._amount); if (sb == null || !acc || !(amt > 0)) return null; const expected = accountFlows(acc, transactions).balance + (x._type === 'Income' ? amt : -amt); const diff = sb - expected; return { sms: sb, expected, diff, ok: Math.abs(diff) < 0.5 }; };
  const autoMatch = x => { const cfg = configs.find(c => String(c.account_id) === String(x._acc)); const hay = `${x._desc} ${x.body}`.toLowerCase(); const amt = Number(x._amount); return x._type === 'Expense' && amt > 0 && (cfg?.auto_rules || []).some(r => r.merchant && hay.includes(String(r.merchant).toLowerCase()) && amt <= Number(r.max)); };
  const autoDone = useRef(new Set());
  useEffect(() => {
    if (loading) return;
    const todo = items.filter(x => !isNoise(x) && x._acc && !autoDone.current.has(x.id) && autoMatch(x) && !dupFor(x));
    if (!todo.length) return;
    todo.forEach(x => autoDone.current.add(x.id));
    (async () => { let n = 0; for (const x of todo) { if (await approve(x, { auto: true, bulk: true })) n++; } if (n > 1) setToast(`Auto-approved ${n} SMS`); })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, loading, configs]);
  const picked = shown.filter(x => sel.includes(x.id));
  const toggleSel = id => setSel(o => o.includes(id) ? o.filter(i => i !== id) : [...o, id]);
  const bulkApply = () => { picked.forEach(x => patch(x.id, { ...(bulk.cat ? { _cat: bulk.cat, _splits: null } : {}), ...(bulk.acc ? { _acc: bulk.acc } : {}) })); setToast(`Updated ${picked.length} SMS`); };
  const bulkApprove = async () => { for (const x of picked) await approve(x, { bulk: true }); setSel([]); };
  const bulkDismiss = async () => { for (const x of picked) await dismiss(x); setSel([]); };
  const exportHist = fmtName => exportTable(fmtName, 'bank-sms-history', 'Bank SMS', histShown.map(x => ({ Date: localISODate(new Date(x.received_at)), Status: x.status, Sender: x.sender || '', Type: x.txn_type || '', [`Amount (${currency})`]: x.amount ?? '', Account: accLabel(x.account_id) || '', Category: x.category || '', Description: x.merchant || '', Message: x.body })));
  const accLabel = id => usable.find(a => String(a.id) === String(id))?.name;

  const testResult = useMemo(() => {
    if (!test.body.trim()) return null;
    const probe = parseSms(test.body, {});
    const cfg = matchAccount(configs, test.sender, probe.last4);
    const p = parseSms(test.body, cfg || {});
    return { ...p, account: cfg ? accounts.find(a => a.id === cfg.account_id)?.name : null };
  }, [test, configs, accounts]);

  const jsonBody = `{"token":"${token || 'YOUR_TOKEN'}","sender":"<Sender>","body":"<Message>"}`;
  const inSettings = ['banks', 'connect', 'test', 'devices', 'rules', 'setup'].includes(tab);
  const cur = inSettings ? main : tab;
  useEffect(() => { if (!inSettings && !insOpen) return; const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o; }; }, [inSettings, insOpen]);
  const isTab = k => ['inbox', 'insights', 'history'].includes(k) ? tab === k : inSettings;
  const tabs = [['inbox', 'Inbox', Inbox, items.length], ['insights', 'Insights', BarChart3], ['history', 'History', History], [inSettings ? tab : 'connect', 'Settings', Settings2]];
  const subnav = <div className="sms-seg sms-sub" role="tablist">{[['connect', 'Phone'], ['banks', 'Banks'], ['devices', 'Devices'], ['rules', 'Learned rules'], ['test', 'Try an SMS']].map(([k, l]) => <button type="button" key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>;
  const filters = <div className="smx-filters">
    <label className="smx-search"><Search size={15} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search merchant or message" aria-label="Search SMS" /></label>
    <select value={fAcc} onChange={e => setFAcc(e.target.value)} aria-label="Filter by account"><option value="">All accounts</option>{cur === 'inbox' && <option value="none">No account</option>}{usable.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
    <select value={range} onChange={e => setRange(e.target.value)} aria-label="Date range"><option value="all">Any date</option><option value="today">Today</option><option value="week">Last 7 days</option><option value="month">This month</option></select>
  </div>;

  return <div className="sms-page">
    <PageHeading eyebrow="AUTOMATIC TRACKING" title="Bank SMS" titleExtra={<span className={`sms-conn ${lastSms ? "ok" : ""}`} title={lastSms ? `Last SMS ${ago(lastSms)}` : "Open Setup to connect your phone"}>{lastSms ? "Connected" : "Not connected"}</span>} subtitle="Bank messages land here first. You review them before they become transactions." actions={<><MenuButton label="Export" icon={Download} items={[{ label: 'CSV', description: 'Plain text, opens anywhere', icon: FileText, onClick: () => exportHist('csv') }, { label: 'Excel', description: '.xlsx spreadsheet', icon: FileSpreadsheet, onClick: () => exportHist('xlsx') }]} disabled={!histShown.length} /><button type="button" className="btn btn-secondary" onClick={() => setInsOpen(true)}><BarChart3 size={17} /> Insights</button><button type="button" className="btn btn-primary" onClick={() => setTab('connect')}><Settings2 size={17} /> Setup</button></>}/>
    <section className="sms-main">
    <div className="period-switch" role="group" aria-label="Message status"><div className="period-seg">{[['inbox', 'To review', items.length], ['approved', 'Approved', hist.filter(h => h.status === 'approved').length], ['dismissed', 'Dismissed', hist.filter(h => h.status === 'dismissed').length]].map(([k, l, n]) => { const on = k === 'inbox' ? cur === 'inbox' : cur === 'history' && hStatus === k; return <button type="button" key={k} className={on ? 'on' : ''} aria-pressed={on} onClick={() => { if (k === 'inbox') setTab('inbox'); else { setHStatus(k); setTab('history'); } }}>{l} {n}</button>; })}</div></div>
    {cur === 'inbox' && <section className="sms-pane">
      {filters}
      {groups.length > 0 && shown.length > 1 && <div className="smx-groups"><span>Quick groups</span>{groups.map(g => <button type="button" key={g.key} className="sms-chipbtn" onClick={() => approveGroup(g)}>{g.label} ×{g.ids.length} · Approve</button>)}</div>}
      {shown.length > 0 && <div className="sms-pane-top"><p>{`${shown.length} waiting for review`}</p><button type="button" className="btn btn-sm" onClick={() => { setSelectMode(m => !m); setSel([]); }}>{selectMode ? 'Done selecting' : 'Select'}</button>{shown.filter(x => x._acc && Number(x._amount) > 0).length > 1 && <button type="button" className="btn btn-primary btn-sm" onClick={approveAll}><Check size={14} /> Approve all ready ({shown.filter(x => x._acc && Number(x._amount) > 0).length})</button>}</div>}
      {!loading && !payments.length && hist.length > 0 && <div className="sms-empty"><CheckCircle2 size={26} /><b>All caught up</b><small>New bank messages will show up here.</small></div>}
      {!loading && !payments.length && !hist.length && <div className="sms-empty"><MessageSquare size={26} /><b>No SMS yet</b><small>Connect your phone, then new bank messages show up here.</small><button type="button" className="btn btn-primary btn-sm" onClick={() => setTab('connect')}>Connect phone</button></div>}
      {selectMode && <div className="smx-bulk"><label className="smx-bulk-all"><input type="checkbox" checked={shown.length > 0 && picked.length === shown.length} onChange={e => setSel(e.target.checked ? shown.map(x => x.id) : [])} /> {picked.length} selected</label>
        <select value={bulk.cat} onChange={e => setBulk(o => ({ ...o, cat: e.target.value }))} aria-label="Set category"><option value="">Category…</option>{[...new Set([...expCats, ...incomeCategories])].map(c => <option key={c}>{c}</option>)}</select>
        <select value={bulk.acc} onChange={e => setBulk(o => ({ ...o, acc: e.target.value }))} aria-label="Set account"><option value="">Account…</option>{usable.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <button type="button" className="btn btn-sm" disabled={!picked.length || (!bulk.cat && !bulk.acc)} onClick={bulkApply}>Apply</button>
        <button type="button" className="btn btn-sm" disabled={!picked.length} onClick={bulkDismiss}><X size={14} /> Dismiss</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={!picked.length} onClick={bulkApprove}><Check size={14} /> Approve</button></div>}
      {shown.length > 0 && <p className="smx-tip">Swipe a row right to approve, left to dismiss. On a computer, drag it or use the buttons.</p>}
      <div className="smx-list smx-cards">{shown.map(x => <SmsCard key={x.id} payTargets={payTargets} conf={confMap[x.id]} sug={suggestAuto(x, hist, configs)} onAutoRule={addAutoRule} xfer={xfers[x.id]} onTransfer={approveTransfer} cur={curOf(x)} x={x} selectMode={selectMode} selected={sel.includes(x.id)} onSelect={toggleSel} dup={dupFor(x)} bal={balFor(x)} usable={usable} expCats={expCats} currency={currency} fmt={fmt} patch={patch} onApprove={approve} onDismiss={dismiss} onRemember={remember} editing={!!editingIds[x.id]} setEditing={setEditing} />)}</div>
      {noise.length > 0 && <details className="sms-other"><summary>Not a payment ({noise.length}) <small>OTP codes, offers…</small></summary>
        {noise.map(x => <div className="sms-other-row" key={x.id}><p dir="auto">{x.body}</p><button type="button" className="btn btn-sm" onClick={() => dismiss(x)}><X size={14} /> Dismiss</button></div>)}
        <div className="sms-actions"><button type="button" className="btn btn-sm" onClick={async () => { for (const x of noise) await dismiss(x); }}>Dismiss all</button></div></details>}
    </section>}

    {cur === 'history' && <section className="sms-pane">
      {filters}
      {!histShown.length ? <div className="sms-empty"><History size={26} /><b>Nothing here</b><small>Approved and dismissed messages appear here.</small></div> :
        <div className="smx-list">{histShown.map(x => <article className="smx-row" key={x.id}>
          <span className={`smx-dot ${x.status}`} />
          <div className="smx-row-main"><b>{x.merchant || x.sender || 'Bank SMS'}</b><small>{new Date(x.received_at).toLocaleDateString()} · {accLabel(x.account_id) || 'No account'}{x.category ? ` · ${x.category}` : ''}</small></div>
          <div className="smx-row-end">{x.amount != null && <b className={x.txn_type === 'Income' ? 'smx-in' : ''}>{x.txn_type === 'Income' ? '+' : '−'}{fmt(x.amount)}</b>}<span className={`sms-pill ${x.status === 'approved' ? 'on' : ''}`}>{x.status === 'approved' ? 'Approved' : 'Dismissed'}</span></div>
          {x.status === 'dismissed' && <button type="button" className="btn btn-sm" onClick={() => restore(x)}><RotateCcw size={14} /> Restore</button>}
        </article>)}</div>}
    </section>}

    </section>

    {insOpen && createPortal(<div className="sms-sheet-wrap"><div className="sms-scrim" onClick={() => setInsOpen(false)} /><aside className="sms-sheet" role="dialog" aria-label="SMS insights"><div className="sms-sheet-top"><h3>SMS insights</h3><button type="button" className="icon-btn" aria-label="Close insights" onClick={() => setInsOpen(false)}><X size={18} /></button></div><div className="sms-sheet-body"><SmsInsights items={items} hist={hist} configs={configs} usable={usable} accounts={accounts} transactions={transactions} fmt={fmt} flagged={flagged} /></div></aside></div>, document.body)}

    {inSettings && createPortal(<div className="sms-sheet-wrap"><div className="sms-scrim" onClick={() => setTab(main)} />
    <aside className="sms-sheet" role="dialog" aria-label="SMS setup">
      <div className="sms-sheet-top"><h3>SMS setup</h3><button type="button" className="icon-btn" aria-label="Close setup" onClick={() => setTab(main)}><X size={18} /></button></div>
      <div className="sms-sheet-body">
      <div className={`sms-acc ${tab === 'connect' ? 'open' : ''}`}>
        <button type="button" className="sms-acc-h" aria-expanded={tab === 'connect'} onClick={() => setTab(tab === 'connect' ? 'setup' : 'connect')}><span><b>Phone</b><small>{lastSms ? `Connected · last SMS ${ago(lastSms)}` : 'Token and shortcut'}</small></span><ChevronDown size={16} /></button>
        {tab === 'connect' && <>
<div className="sms-sec-body">
      {(() => { const bankDone = configs.some(c => (c.senders || []).length || (c.card_last4 || []).length); const steps = [['Token', !!token], ['Shortcut', !!lastSms], ['Banks', bankDone]]; return <div className="sms-steps" role="tablist">{steps.map(([l, done], i) => <button type="button" key={l} className={`${cstep === i + 1 ? 'on' : ''} ${done ? 'done' : ''}`} onClick={() => setCstep(i + 1)}><i>{i + 1}</i>{l}</button>)}</div>; })()}
      {cstep === 1 && <div className="sms-card"><h4 className="sms-dup">Your private token</h4><p>Created for you automatically. It tells Pocket the SMS is yours. Never share it.</p>
        <div className="sms-copy"><code>{token ? (showTok ? token : `${token.slice(0, 4)}••••••••••••${token.slice(-4)}`) : 'Creating…'}</code><button type="button" className="icon-btn" aria-label={showTok ? 'Hide token' : 'Show token'} onClick={() => setShowTok(v => !v)}>{showTok ? <EyeOff size={15} /> : <Eye size={15} />}</button><button type="button" className="icon-btn" aria-label="Copy token" disabled={!token} onClick={() => copy(token, setToast)}><Copy size={15} /></button></div>
        <div className="sms-actions"><button type="button" className="btn btn-sm" onClick={() => { if (!token || window.confirm('Make a new token? Your phone will stop working until you paste the new token into the Shortcut.')) makeToken(); }}><RefreshCw size={14} /> New token</button><button type="button" className="btn btn-primary btn-sm" disabled={!token} onClick={() => setCstep(2)}>Next</button></div></div>}
      {cstep === 2 && <>
        <div className="sms-card"><h4 className="sms-dup">Add the Shortcut on your phone</h4>
          <div className="sms-seg"><button type="button" className={platform === 'iphone' ? 'on' : ''} onClick={() => setPlatform('iphone')}>iPhone</button><button type="button" className={platform === 'android' ? 'on' : ''} onClick={() => setPlatform('android')}>Android</button></div>
          <p>1 · Address</p><div className="sms-copy"><code>{endpoint}</code><button type="button" className="icon-btn" aria-label="Copy address" onClick={() => copy(endpoint, setToast)}><Copy size={15} /></button></div>
          <p>2 · Token</p><div className="sms-copy"><code>{token ? `${token.slice(0, 4)}••••••••••••${token.slice(-4)}` : '—'}</code><button type="button" className="icon-btn" aria-label="Copy token" disabled={!token} onClick={() => copy(token, setToast)}><Copy size={15} /></button></div>
          {platform === 'android' && <><p>3 · Body (JSON)</p><div className="sms-copy"><code>{jsonBody}</code><button type="button" className="icon-btn" aria-label="Copy body" onClick={() => copy(jsonBody, setToast)}><Copy size={15} /></button></div></>}
          {platform === 'iphone' ? <ol>
            <li>Open <b>Shortcuts</b> → <b>Automation</b> → <b>+</b> → <b>Message</b>.</li>
            <li>Sender <b>contains</b> your bank name (or Message <b>contains</b> <code>EGP</code>). Choose <b>Run Immediately</b>.</li>
            <li>Add <b>Get Contents of URL</b>: URL = the address, Method <b>POST</b>, Request Body <b>JSON</b>.</li>
            <li>Add 3 fields: <code>token</code> = your token · <code>sender</code> = <i>Shortcut Input → Sender</i> · <code>body</code> = <i>Shortcut Input → Content</i>.</li>
          </ol> : <ol>
            <li>Install <b>SMS Forwarder</b> and allow SMS access.</li>
            <li>New rule: sender contains your bank → forward to <b>Webhook</b> (POST, <code>application/json</code>).</li>
            <li>Paste the address and the JSON body above.</li>
          </ol>}
          <DailyCheck link={token ? `${endpoint}?ping=1&token=${token}` : ''} seen={mainSeen} platform={platform} copy={copy} setToast={setToast} />
          <div className={`sms-wait ${lastSms ? 'ok' : ''}`}>{lastSms ? <><Check size={15} /> Connected. Last SMS {ago(lastSms)}.</> : <><Clock size={15} /> Waiting for your first SMS… send yourself a message that matches your rule.</>}</div>
          <div className="sms-actions"><button type="button" className="btn btn-sm" onClick={() => setCstep(1)}>Back</button><button type="button" className="btn btn-sm" disabled={testing} onClick={sendTest}>{testing ? 'Sending…' : 'Send a test'}</button><button type="button" className="btn btn-primary btn-sm" onClick={() => setCstep(3)}>Next</button></div>
          <p className="sms-hint">Don’t press ▶ inside Shortcuts to test. With no real SMS it sends an empty message and you’ll see “Missing SMS body”. Use “Send a test” here instead.</p></div>
        <details className="sms-other"><summary>Something not working?</summary><div className="sms-trouble"><p><b>“Missing SMS body”</b> — you pressed ▶ in Shortcuts. It only works on a real SMS.</p><p><b>“Invalid token”</b> — the token in the Shortcut is old. Copy it again.</p><p><b>Nothing arrives</b> — Sender filter must be “contains” (not “is”), and Run Immediately must be on.</p></div></details>
        <details className="sms-other"><summary>Advanced: automatic catch-up <small>optional</small></summary>
          <p>Live forwarding can miss a message (phone offline, battery saver). A second automation re-sends the last day of bank SMS. Messages already in Pocket are skipped.</p>
          {platform === 'iphone' ? <ol>
            <li><b>Shortcuts</b> → <b>Automation</b> → <b>+</b> → <b>Time of Day</b>, daily, <b>Run Immediately</b>.</li>
            <li>Add <b>Find Messages</b>: Date is in the last <b>1 day</b> and Content contains <code>EGP</code>.</li>
            <li>Add <b>Repeat with Each</b>, and inside it <b>Get Contents of URL</b> with the same address, POST, JSON.</li>
            <li>Fields: <code>token</code>, <code>sender</code> = <i>Repeat Item → Sender</i>, <code>body</code> = <i>Repeat Item → Content</i>, <code>date</code> = <i>Repeat Item → Date</i> as <b>ISO 8601</b>.</li>
          </ol> : <ol>
            <li>In <b>SMS Forwarder</b> turn on <b>Retry failed</b>.</li>
            <li>Keep the same JSON body and add <code>"date":"&lt;Timestamp&gt;"</code> if the app offers it.</li>
          </ol>}</details></>}
      {cstep === 3 && <div className="sms-card"><h4 className="sms-dup">Link each bank to an account</h4><p>{configs.filter(c => (c.senders || []).length || (c.card_last4 || []).length).length ? `${configs.filter(c => (c.senders || []).length || (c.card_last4 || []).length).length} account(s) set up.` : 'You can skip this. The first time an SMS arrives, tap “Remember” on its card and Pocket links that bank for you.'}</p>
        <div className="sms-actions"><button type="button" className="btn btn-sm" onClick={() => setCstep(2)}>Back</button><button type="button" className="btn btn-sm" onClick={() => setTab('banks')}><Settings2 size={14} /> Set up accounts</button><button type="button" className="btn btn-primary btn-sm" onClick={() => setTab('inbox')}>Done</button></div></div>}
    </div>
        </>}
      </div>
      <div className={`sms-acc ${tab === 'banks' ? 'open' : ''}`}>
        <button type="button" className="sms-acc-h" aria-expanded={tab === 'banks'} onClick={() => setTab(tab === 'banks' ? 'setup' : 'banks')}><span><b>Banks</b><small>Which sender and card belong to each account</small></span><ChevronDown size={16} /></button>
        {tab === 'banks' && <>
<div className="sms-sec-body">
      {usable.length ? usable.map(a => <AccountConfig key={a.id + (configs.find(c => c.account_id === a.id)?.updated_at || '')} account={a} cfg={configs.find(c => c.account_id === a.id)} userId={userId} supabase={supabase} categories={expCats} setToast={setToast} open={String(openAcc) === String(a.id)} onToggle={() => setOpenAcc(o => String(o) === String(a.id) ? null : a.id)} onSaved={row => setConfigs(o => [...o.filter(c => c.account_id !== row.account_id), row])} />) : <div className="sms-empty"><b>No accounts yet</b><small>Add an account first.</small></div>}
      <div className="sms-actions"><button type="button" className="btn btn-sm" disabled={testing} onClick={sendTest}>{testing ? 'Sending…' : 'Send test SMS'}</button></div>
    </div>
        </>}
      </div>
      <div className={`sms-acc ${tab === 'devices' ? 'open' : ''}`}>
        <button type="button" className="sms-acc-h" aria-expanded={tab === 'devices'} onClick={() => setTab(tab === 'devices' ? 'setup' : 'devices')}><span><b>Devices</b><small>{devices.filter(d => !d.revoked).length + 1} connected</small></span><ChevronDown size={16} /></button>
        {tab === 'devices' && <>
<div className="sms-sec-body">
      <SmsDevices devices={devices} setDevices={setDevices} token={token} lastSms={lastSms} mainSeen={mainSeen} endpoint={endpoint} userId={userId} supabase={supabase} setToast={setToast} copy={copy} makeToken={makeToken} quiet={quiet} setQuiet={setQuiet} exportHist={exportHist} histCount={histShown.length} />
    </div>
        </>}
      </div>
      <div className={`sms-acc ${tab === 'rules' ? 'open' : ''}`}>
        <button type="button" className="sms-acc-h" aria-expanded={tab === 'rules'} onClick={() => setTab(tab === 'rules' ? 'setup' : 'rules')}><span><b>Learned rules</b><small>What Pocket learned and your auto-approve rules</small></span><ChevronDown size={16} /></button>
        {tab === 'rules' && <>
<div className="sms-sec-body">
      {configs.flatMap(c => (c.learned || []).map((l, i) => ({ c, l, i }))).map(({ c, l, i }) => <div className="smd-row" key={`${c.account_id}-${i}`}><span className="smd-ic"><RefreshCw size={15} /></span><div><b>{l.bank || 'Bank'}: amount pattern</b><small>{usable.find(a => a.id === c.account_id)?.name || 'Account'} · learned {ago(l.at)} · <code>{l.pattern}</code></small></div><button type="button" className="btn btn-sm" onClick={async () => { const row = { ...c, learned: (c.learned || []).filter((_, j) => j !== i), amount_pattern: c.amount_pattern === l.pattern ? null : c.amount_pattern, updated_at: new Date().toISOString() }; const { data, error } = await supabase.from('account_sms_config').upsert(row, { onConflict: 'account_id' }).select().single(); if (error) { setToast(error.message); return; } setConfigs(o => [...o.filter(z => z.account_id !== data.account_id), data]); }}>Remove</button></div>)}
      {!configs.some(c => (c.learned || []).length) && <div className="sms-empty"><b>Nothing learned yet</b><small>When you fix an amount before approving, Pocket remembers how that bank writes it.</small></div>}
      {configs.flatMap(c => (c.auto_rules || []).map((r, i) => ({ c, r, i }))).length > 0 && <><h4 className="smd-sub">Auto-approve rules</h4>{configs.flatMap(c => (c.auto_rules || []).map((r, i) => ({ c, r, i }))).map(({ c, r, i }) => <div className="smd-row" key={`${c.account_id}-r${i}`}><span className="smd-ic"><Check size={15} /></span><div><b>{r.merchant}</b><small>{usable.find(a => a.id === c.account_id)?.name} · up to {fmt(r.max)}</small></div><button type="button" className="btn btn-sm" onClick={async () => { const row = { ...c, auto_rules: (c.auto_rules || []).filter((_, j) => j !== i), updated_at: new Date().toISOString() }; const { data, error } = await supabase.from('account_sms_config').upsert(row, { onConflict: 'account_id' }).select().single(); if (error) { setToast(error.message); return; } setConfigs(o => [...o.filter(z => z.account_id !== data.account_id), data]); }}>Remove</button></div>)}</>}
      <h4 className="smd-sub">Backup</h4>
      <SmsRulesBackup configs={configs} accounts={accounts} userId={userId} supabase={supabase} setToast={setToast} onImported={row => setConfigs(o => [...o.filter(z => z.account_id !== row.account_id), row])} />
    </div>
        </>}
      </div>
      <div className={`sms-acc ${tab === 'test' ? 'open' : ''}`}>
        <button type="button" className="sms-acc-h" aria-expanded={tab === 'test'} onClick={() => setTab(tab === 'test' ? 'setup' : 'test')}><span><b>Try an SMS</b><small>Paste a bank SMS to see how Pocket reads it. Nothing is saved</small></span><ChevronDown size={16} /></button>
        {tab === 'test' && <>
<div className="sms-sec-body">
      <div className="form-grid"><Field label="Sender (optional)"><input value={test.sender} onChange={e => setTest(o => ({ ...o, sender: e.target.value }))} placeholder="CIB" /></Field><Field label="Message" wide><textarea rows={4} dir="auto" value={test.body} onChange={e => setTest(o => ({ ...o, body: e.target.value }))} placeholder="Paste the SMS here" /></Field></div>
      {testResult && <div className="sms-result"><div><small>Type</small><b>{testResult.type === 'Income' ? 'Money in' : testResult.type === 'Expense' ? 'Money out' : 'Not detected'}</b></div><div><small>Amount</small><b>{testResult.amount ?? 'Not detected'}</b></div><div><small>Merchant</small><b>{testResult.merchant || '—'}</b></div><div><small>Account</small><b>{testResult.account || 'No match'}</b></div></div>}
    </div>
        </>}
      </div>
      </div>
    </aside></div>, document.body)}
    {undo && <div className="smx-undo" role="status"><span>Approved {undo.label}</span><button type="button" onClick={doUndo}>Undo</button></div>}
  </div>;
}
