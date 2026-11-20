import { useEffect, useMemo, useState } from 'react';
import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { MetricCard } from '../../components/ui/MetricCard.jsx';
import { ModalShell } from '../../components/modals/ModalShell.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Users, Clock, CircleDollarSign, Star, Settings2 } from '../../lib/icons.jsx';
import { PLUS_DEFAULTS, rowIsLive, nextPeriodEnd, daysLeft } from '../../lib/plus.js';

// Owner / Super Admin: who has Pocket Plus, payments to confirm, give Plus, and prices.
const fmtDate = v => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function SettingsModal({ settings, onClose, onSave }) {
  const [f, setF] = useState({ ...PLUS_DEFAULTS, ...settings });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));
  return <ModalShell title="Plus settings" subtitle="Prices, trial length and where people send money." onClose={onClose}>
    <div className="form-grid">
      <Field label={`1-day price (${f.currency})`}><input type="number" inputMode="decimal" min="0" value={f.daily_price ?? 0} onChange={e => set('daily_price', e.target.value)} placeholder="0 = not offered" /></Field>
      <Field label={`Monthly price (${f.currency})`}><input type="number" inputMode="decimal" min="0" value={f.monthly_price} onChange={e => set('monthly_price', e.target.value)} placeholder="0 = not offered" /></Field>
      <Field label={`Yearly price (${f.currency})`}><input type="number" inputMode="decimal" min="0" value={f.yearly_price} onChange={e => set('yearly_price', e.target.value)} placeholder="0 = not offered" /></Field>
      <Field label="Free trial (days)"><input type="number" inputMode="numeric" min="0" max="90" value={f.trial_days} onChange={e => set('trial_days', e.target.value)} /></Field>
      <Field label="InstaPay address"><input value={f.instapay} onChange={e => set('instapay', e.target.value)} placeholder="name@instapay" /></Field>
      <Field label="InstaPay payment link" wide hint="In InstaPay, open your profile and tap Share to get it. It opens InstaPay on the user's phone with your address filled in."><input value={f.instapay_link || ''} onChange={e => set('instapay_link', e.target.value.trim())} placeholder="https://ipn.eg/S/name/instapay/…" inputMode="url" />{f.instapay_link && !/^https:\/\/ipn\.eg\/S\/[^/\s]+\/instapay\/[A-Za-z0-9]+\/?$/i.test(f.instapay_link) && <small className="cc-error">This does not look like an InstaPay link. It should start with https://ipn.eg/S/</small>}</Field>
      <Field label="Wallet number" wide><input value={f.wallet} onChange={e => set('wallet', e.target.value)} placeholder="010… (Vodafone Cash or any wallet)" /></Field>
    </div>
    <p className="small-muted" style={{ marginTop: 10 }}>Leave a price at 0 to hide that option. Leave both the InstaPay address and the wallet empty to turn paying off.</p>
    <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy} onClick={async () => { setBusy(true); await onSave({ ...f, daily_price: Number(f.daily_price) || 0, monthly_price: Number(f.monthly_price) || 0, yearly_price: Number(f.yearly_price) || 0, trial_days: Math.max(0, Number(f.trial_days) || 0), instapay: f.instapay.trim(), wallet: f.wallet.trim() }); setBusy(false); }}>{busy ? 'Saving…' : 'Save'}</button></div>
  </ModalShell>;
}

function GiveModal({ users, onClose, onGive }) {
  const [user, setUser] = useState('');
  const [length, setLength] = useState('1m');
  const [weeks, setWeeks] = useState('2');
  const [busy, setBusy] = useState(false);
  return <ModalShell title="Give Plus to a user" subtitle="Turns on Bank SMS, Vehicles and the chat for them, free." onClose={onClose}>
    <div className="form-grid">
      <Field label="User" wide><select value={user} onChange={e => setUser(e.target.value)}><option value="">Choose a user…</option>{users.map(u => <option key={u.user_id ?? u.id} value={u.user_id ?? u.id}>{u.username ? `${u.username}${u.full_name ? ` · ${u.full_name}` : ""}` : (u.full_name || u.email)}</option>)}</select></Field>
    </div>
    <div className="cc-options" role="radiogroup" aria-label="For how long" style={{ marginTop: 14 }}>
      {[['1w', '1 week'], ['1m', '1 month'], ['12m', '1 year'], ['custom', 'Custom weeks'], ['none', 'No end date']].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={length === k} className={`cc-option ${length === k ? 'on' : ''}`} onClick={() => setLength(k)}><span><b>{l}</b></span></button>)}
    </div>
    {length === 'custom' && <div className="form-grid" style={{ marginTop: 14 }}><Field label="Number of weeks" hint={Number(weeks) > 0 ? `Ends ${new Date(Date.now() + Number(weeks) * 7 * 864e5).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}><input type="number" inputMode="numeric" min="1" max="520" value={weeks} onChange={e => setWeeks(e.target.value)} /></Field></div>}
    <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={!user || busy || (length === 'custom' && !(Number(weeks) > 0))} onClick={async () => { setBusy(true); await onGive(user, length === 'none' ? null : length === 'custom' ? { weeks: Number(weeks) } : length.endsWith('w') ? { weeks: Number(length.slice(0, -1)) } : { months: Number(length.slice(0, -1)) }); setBusy(false); }}>{busy ? 'Saving…' : 'Give Plus'}</button></div>
  </ModalShell>;
}

function RejectModal({ row, name, onClose, onReject }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  return <ModalShell title="Payment not found" subtitle={`Tell ${name} what to check. They will see this note.`} onClose={onClose}>
    <div className="form-grid"><Field label="Note" wide><textarea className="pocket-textarea" rows="3" value={note} onChange={e => setNote(e.target.value)} placeholder="Example: we did not get a transfer from this number. Check the amount and send again." /></Field></div>
    <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn btn-danger" disabled={busy} onClick={async () => { setBusy(true); await onReject(row, note.trim()); setBusy(false); }}>{busy ? 'Saving…' : 'Mark as not found'}</button></div>
  </ModalShell>;
}

export function SubscriptionsAdminPage({ supabase, users = [], settings, onSaveSettings, currency = 'EGP', onToast, onPendingCount }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('confirm');
  const [modal, setModal] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const money = n => new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(n) || 0);
  const nameOf = id => { const u = users.find(x => String(x.user_id ?? x.id) === String(id)); return u ? (u.full_name || u.email || u.username) : 'User'; };
  const emailOf = id => users.find(x => String(x.user_id ?? x.id) === String(id))?.email || '';

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false });
    if (error) onToast?.(`Could not load subscriptions: ${error.message}`); else setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const now = Date.now();
  const byUser = useMemo(() => { const m = {}; rows.forEach(r => { (m[r.user_id] ||= []).push(r); }); return m; }, [rows]);
  const pending = rows.filter(r => r.status === 'pending');
  useEffect(() => { onPendingCount?.(pending.length); }, [pending.length]);
  const live = rows.filter(r => rowIsLive(r, now));
  const paying = new Set(live.filter(r => r.status === 'active' && r.period !== 'gift').map(r => r.user_id));
  const trials = new Set(live.filter(r => r.status === 'trial').map(r => r.user_id));
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const income = rows.filter(r => r.status === 'active' && r.confirmed_at && new Date(r.confirmed_at) >= monthStart).reduce((s, r) => s + Number(r.amount || 0), 0);

  const list = rows.filter(r => tab === 'confirm' ? r.status === 'pending'
    : tab === 'trial' ? r.status === 'trial' && rowIsLive(r, now)
    : tab === 'active' ? r.status === 'active' && rowIsLive(r, now)
    : tab === 'ended' ? !rowIsLive(r, now) && r.status !== 'pending'
    : true);

  async function update(r, patch, msg) {
    setBusyId(r.id);
    const { data, error } = await supabase.from('subscriptions').update(patch).eq('id', r.id).select().single();
    setBusyId(null);
    if (error) { onToast?.(error.message); return false; }
    setRows(o => o.map(x => x.id === r.id ? data : x)); onToast?.(msg); return true;
  }
  const confirm = r => update(r, { status: 'active', current_period_end: nextPeriodEnd(r.period, (byUser[r.user_id] || []).filter(x => x.id !== r.id), now) }, `Plus is on for ${nameOf(r.user_id)}`);
  async function reject(r, note) { if (await update(r, { status: 'rejected', admin_note: note || null }, 'Marked as not found')) setModal(null); }
  const stop = r => update(r, { status: 'cancelled', current_period_end: new Date().toISOString(), trial_ends_at: r.status === 'trial' ? new Date().toISOString() : r.trial_ends_at }, `Plus stopped for ${nameOf(r.user_id)}`);
  async function give(userId, len) {
    const end = len ? (() => { const d = new Date(); if (len.weeks) d.setDate(d.getDate() + len.weeks * 7); else d.setMonth(d.getMonth() + len.months); return d.toISOString(); })() : null;
    const { data, error } = await supabase.from('subscriptions').insert({ user_id: userId, period: 'gift', status: 'active', payment_method: 'gift', amount: 0, current_period_end: end }).select().single();
    if (error) { onToast?.(error.message); return; }
    setRows(o => [data, ...o]); setModal(null); onToast?.(`Plus given to ${nameOf(userId)}`);
  }

  async function openProof(path) {
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 300);
    if (error || !data?.signedUrl) { onToast?.('Could not open the screenshot.'); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  }
  const status = r => {
    if (r.status === 'pending') return <span className="sms-pill warn">To confirm</span>;
    if (r.status === 'rejected') return <span className="sms-pill bad">Not found</span>;
    if (rowIsLive(r, now)) return r.status === 'trial' ? <span className="sms-pill">Trial</span> : <span className="sms-pill on">{r.period === 'gift' ? 'Given' : r.auto_confirmed ? 'Active · auto' : 'Active'}</span>;
    return <span className="sms-pill muted">{r.status === 'cancelled' ? 'Stopped' : 'Ended'}</span>;
  };
  const when = r => r.status === 'pending' ? `Sent ${fmtDate(r.created_at)}` : r.status === 'trial' ? (rowIsLive(r, now) ? `${daysLeft(r.trial_ends_at)} days left` : `Ended ${fmtDate(r.trial_ends_at)}`) : r.current_period_end ? `${rowIsLive(r, now) ? (r.cancel_at_period_end ? 'Ends' : 'Renews') : 'Ended'} ${fmtDate(r.current_period_end)}` : 'No end date';
  const how = r => r.payment_method === 'instapay' ? `InstaPay · ${r.payer_handle || ''}` : r.payment_method === 'wallet' ? `Wallet · ${r.payer_handle || ''}` : r.payment_method === 'gift' ? 'Given by the Owner' : 'Free trial';

  return <div className="plus-admin">
    <PageHeading eyebrow="ADMIN" title="Subscriptions" subtitle="Pocket Plus turns on Bank SMS, Vehicles and the chat." actions={<div className="plus-admin-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal({ kind: 'settings' })}><Settings2 size={16} /> Settings</button><button type="button" className="btn btn-primary" onClick={() => setModal({ kind: 'give' })}>Give Plus</button></div>} />
    <div className="metric-grid">
      <MetricCard label="Paying" value={String(paying.size)} icon={Users} tone="green" note="Plus that someone paid for" />
      <MetricCard label="On trial" value={String(trials.size)} icon={Star} tone="blue" note={`${Number({ ...PLUS_DEFAULTS, ...settings }.trial_days) || 14}-day free trial`} />
      <MetricCard label="To confirm" value={String(pending.length)} icon={Clock} tone="orange" note={pending.length ? 'No matching SMS yet. Check by hand' : 'Nothing waiting'} />
      <MetricCard label="This month" value={money(income)} icon={CircleDollarSign} tone="purple" note="Payments you confirmed" />
    </div>
    <Tabs label="Subscriptions" value={tab} onChange={setTab} items={[{ key: 'confirm', label: 'To confirm', count: pending.length }, { key: 'active', label: 'Active' }, { key: 'trial', label: 'Trial' }, { key: 'ended', label: 'Ended' }, { key: 'all', label: 'All' }]} />
    <section className="panel plus-admin-list">
      {loading ? <p className="small-muted">Loading…</p> : !list.length ? <div className="smi-empty"><span className="smi-empty-ic"><Star size={18} /></span><p>{tab === 'confirm' ? 'No payments waiting. New ones show up here.' : 'Nothing here yet.'}</p></div>
        : list.map(r => <div className="plus-admin-row" key={r.id}>
          <div className="plus-admin-who"><b>{nameOf(r.user_id)}</b><small>{emailOf(r.user_id)}</small></div>
          <div className="plus-admin-plan"><b>{r.period === 'yearly' ? 'Yearly' : r.period === 'monthly' ? 'Monthly' : r.period === 'daily' ? '1 day' : r.period === 'gift' ? 'Given' : 'Trial'}{Number(r.amount) > 0 ? ` · ${money(r.amount)}` : ''}</b><small>{how(r)}{r.payer_name ? ` · ${r.payer_name}` : ''}{r.payment_ref ? ` · ref ${r.payment_ref}` : ''}</small>{r.match_note && <small className="plus-admin-auto">✓ Auto-confirmed · {r.match_note.replace(/^Matched by /, 'matched by ')}</small>}{r.proof_path && <button type="button" className="plus-admin-proof" onClick={() => openProof(r.proof_path)}>See screenshot</button>}</div>
          <div className="plus-admin-status">{status(r)}<small>{when(r)}</small></div>
          <div className="plus-admin-act">
            {r.status === 'pending' && <><button type="button" className="btn btn-primary btn-sm" disabled={busyId === r.id} onClick={() => confirm(r)}>Confirm</button><button type="button" className="btn btn-secondary btn-sm" onClick={() => setModal({ kind: 'reject', row: r })}>Not found</button></>}
            {rowIsLive(r, now) && <button type="button" className="btn btn-secondary btn-sm" disabled={busyId === r.id} onClick={() => stop(r)}>Stop</button>}
          </div>
        </div>)}
    </section>
    {modal?.kind === 'settings' && <SettingsModal settings={settings} onClose={() => setModal(null)} onSave={async v => { if (await onSaveSettings(v)) setModal(null); }} />}
    {modal?.kind === 'give' && <GiveModal users={users} onClose={() => setModal(null)} onGive={give} />}
    {modal?.kind === 'reject' && <RejectModal row={modal.row} name={nameOf(modal.row.user_id)} onClose={() => setModal(null)} onReject={reject} />}
  </div>;
}
