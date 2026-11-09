import { Check, Clock, Copy, Download, Link2, Eye, EyeOff, Plus, RefreshCw, Smartphone, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { downloadJson } from '../../lib/smsInsights.js';

const mask = t => (t ? `${t.slice(0, 4)}••••••••••••${t.slice(-4)}` : '—');
const ago = d => { if (!d) return 'never used'; const m = Math.round((Date.now() - new Date(d).getTime()) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

const stat = d => { if (!d) return ['never', 'Not connected']; const days = (Date.now() - new Date(d).getTime()) / 864e5; return days <= 3 ? ['ok', 'Connected'] : ['warn', 'Quiet']; };
const Stat = ({ at }) => { const [k, l] = stat(at); return <span className={`smd-stat ${k}`}>{l}</span>; };
const fullDate = d => d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export function DailyCheck({ link, seen, platform, copy, setToast }) {
  return <details className="smd-daily"><summary><b>Daily check</b><span>Optional · tells Pocket your phone is still connected</span></summary>
    <p>Pocket cannot look at your phone, so the phone says “I’m here” once a day. It sends no SMS.</p>
    <div className="sms-copy"><code>{link ? `${link.slice(0, 34)}…` : '—'}</code><button type="button" className="icon-btn" aria-label="Copy check link" disabled={!link} onClick={() => copy(link, setToast)}><Copy size={15} /></button></div>
    {platform === 'iphone' ? <ol>
      <li>Open <b>Shortcuts</b> → <b>Automation</b> → <b>+</b> → <b>Time of Day</b>.</li>
      <li>Pick <b>12:00 AM</b>, <b>Repeat: Daily</b>, then <b>Run Immediately</b>.</li>
      <li>Add <b>Get Contents of URL</b> and paste the check link above. Leave Method as <b>GET</b>.</li>
    </ol> : <ol>
      <li>Install <b>MacroDroid</b> (or Tasker).</li>
      <li>Trigger: <b>Day/Time</b> → every day.</li>
      <li>Action: <b>HTTP Request</b> → <b>GET</b> → paste the check link above.</li>
    </ol>}
    <div className={`sms-wait ${seen ? 'ok' : ''}`}>{seen ? <><Check size={15} /> Last check {ago(seen)}.</> : <><Clock size={15} /> Waiting for the first check…</>}</div>
  </details>;
}

export function SmsDevices({ devices, setDevices, token, lastSms, mainSeen, endpoint, userId, supabase, setToast, copy, makeToken, quiet, setQuiet, exportHist, histCount }) {
  const [name, setName] = useState('');
  const [reveal, setReveal] = useState({});
  const add = async () => {
    const { data, error } = await supabase.from('sms_devices').insert({ user_id: userId, name: name.trim() || 'Phone' }).select().single();
    if (error) { setToast(error.message); return; }
    setDevices(o => [data, ...o]); setName(''); setToast('Device added. Copy its token into that phone’s Shortcut.');
  };
  const revoke = async d => {
    if (!window.confirm(`Stop “${d.name}” from sending SMS? You can add it again later.`)) return;
    const { error } = await supabase.from('sms_devices').update({ revoked: true }).eq('id', d.id);
    if (error) { setToast(error.message); return; }
    setDevices(o => o.map(x => x.id === d.id ? { ...x, revoked: true } : x)); setToast('Device revoked');
  };
  const remove = async d => { const { error } = await supabase.from('sms_devices').delete().eq('id', d.id); if (error) { setToast(error.message); return; } setDevices(o => o.filter(x => x.id !== d.id)); };
  const live = devices.filter(d => !d.revoked); const dead = devices.filter(d => d.revoked);
  return <div className="smd">
    <div className="sms-card"><p>Each phone has its own token. Revoke one phone without breaking the others. The link icon copies that phone’s daily check link.</p>
      <div className="smd-row"><span className="smd-ic"><Smartphone size={16} /></span><div><b>Main phone <Stat at={mainSeen || (devices.length ? null : lastSms)} /></b><small title={fullDate(mainSeen)}>Last check: {mainSeen ? ago(mainSeen) : devices.length ? 'not yet' : lastSms ? ago(lastSms) : 'never'} · token {reveal.main ? token : mask(token)}</small></div>
        <div className="smd-acts"><button type="button" className="icon-btn" aria-label={reveal.main ? 'Hide token' : 'Show token'} onClick={() => setReveal(o => ({ ...o, main: !o.main }))}>{reveal.main ? <EyeOff size={15} /> : <Eye size={15} />}</button>
        <button type="button" className="icon-btn" aria-label="Copy token" onClick={() => copy(token, setToast)}><Copy size={15} /></button>
        <button type="button" className="icon-btn" aria-label="Copy daily check link" title="Copy daily check link" onClick={() => copy(`${endpoint}?ping=1&token=${token}`, setToast)}><Link2 size={15} /></button>
        <button type="button" className="btn btn-sm" onClick={() => { if (window.confirm('Make a new token? Your main phone stops working until you paste the new token into its Shortcut.')) makeToken(); }}><RefreshCw size={14} /> New token</button></div></div>
      {live.map(d => <div className="smd-row" key={d.id}><span className="smd-ic"><Smartphone size={16} /></span><div><b>{d.name} <Stat at={d.last_seen_at} /></b><small title={fullDate(d.last_seen_at)}>Last check: {ago(d.last_seen_at).replace('never used','never')} · token {reveal[d.id] ? d.token : mask(d.token)}</small></div>
        <div className="smd-acts"><button type="button" className="icon-btn" aria-label={reveal[d.id] ? 'Hide token' : 'Show token'} onClick={() => setReveal(o => ({ ...o, [d.id]: !o[d.id] }))}>{reveal[d.id] ? <EyeOff size={15} /> : <Eye size={15} />}</button>
        <button type="button" className="icon-btn" aria-label="Copy token" onClick={() => copy(d.token, setToast)}><Copy size={15} /></button>
        <button type="button" className="icon-btn" aria-label="Copy daily check link" title="Copy daily check link" onClick={() => copy(`${endpoint}?ping=1&token=${d.token}`, setToast)}><Link2 size={15} /></button>
        <button type="button" className="btn btn-sm" onClick={() => revoke(d)}>Revoke</button></div></div>)}
      {dead.length > 0 && <details className="sms-other"><summary>Revoked ({dead.length})</summary>{dead.map(d => <div className="smd-row" key={d.id}><span className="smd-ic"><Smartphone size={16} /></span><div><b>{d.name}</b><small>revoked</small></div><button type="button" className="icon-btn" aria-label="Delete device" onClick={() => remove(d)}><Trash2 size={15} /></button></div>)}</details>}
      <div className="sms-rule"><input value={name} onChange={e => setName(e.target.value)} placeholder="Name, e.g. Nora’s iPad" /><button type="button" className="btn btn-primary btn-sm" onClick={add}><Plus size={14} /> Add phone</button></div></div>
    <div className="sms-card"><h4>Quiet mode</h4>
      <label className="sms-toggle"><input type="checkbox" checked={quiet} onChange={e => setQuiet(e.target.checked)} /> <span>Clear OTP codes and offers after 7 days</span></label>
      <p className="sms-hint">Messages under “Not a payment” are moved to dismissed once they are a week old. Payments are never touched.</p></div>
    <div className="sms-card"><h4>Backup</h4>
      <div className="sms-actions"><button type="button" className="btn btn-sm" disabled={!histCount} onClick={() => exportHist('csv')}><Download size={14} /> Export history</button></div></div>
  </div>;
}

export function SmsRulesBackup({ configs, accounts, userId, supabase, setToast, onImported }) {
  const file = useRef(null);
  const out = () => downloadJson('pocket-sms-rules.json', { version: 1, rules: configs.map(c => ({ account: accounts.find(a => a.id === c.account_id)?.name || '', enabled: c.enabled, senders: c.senders, card_last4: c.card_last4, default_category: c.default_category, debit_keywords: c.debit_keywords, credit_keywords: c.credit_keywords, amount_pattern: c.amount_pattern, auto_rules: c.auto_rules || [] })) });
  const read = async e => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    try {
      const j = JSON.parse(await f.text()); let n = 0;
      for (const r of j.rules || []) {
        const acc = accounts.find(a => String(a.name).trim().toLowerCase() === String(r.account || '').trim().toLowerCase()); if (!acc) continue;
        const { data, error } = await supabase.from('account_sms_config').upsert({ account_id: acc.id, user_id: userId, enabled: r.enabled !== false, senders: r.senders || [], card_last4: r.card_last4 || [], default_category: r.default_category || null, debit_keywords: r.debit_keywords || [], credit_keywords: r.credit_keywords || [], amount_pattern: r.amount_pattern || null, auto_rules: r.auto_rules || [], updated_at: new Date().toISOString() }, { onConflict: 'account_id' }).select().single();
        if (!error && data) { n++; onImported(data); }
      }
      setToast(n ? `Imported rules for ${n} account${n > 1 ? 's' : ''}` : 'No matching account names found in that file');
    } catch { setToast('That file is not a Pocket rules file'); }
  };
  return <div className="sms-actions"><button type="button" className="btn btn-sm" disabled={!configs.length} onClick={out}><Download size={14} /> Export rules</button><button type="button" className="btn btn-sm" onClick={() => file.current?.click()}><Upload size={14} /> Import rules</button><input ref={file} type="file" accept="application/json,.json" hidden onChange={read} /></div>;
}
