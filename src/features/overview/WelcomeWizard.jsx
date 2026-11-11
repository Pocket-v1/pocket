import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from '../../lib/icons.jsx';

const ACCOUNT_TYPES = [['Bank account', '🏦'], ['Cash', '💵'], ['Digital wallet', '📱']];

// First-run wizard. `steps` already contains only the pages this user may open.
export function WelcomeWizard({ name, currency = 'EGP', canAccount, steps, onCreateAccount, onClose }) {
  const screens = useMemo(() => [{ key: 'welcome' }, ...(canAccount ? [{ key: 'account' }] : []), ...steps, { key: 'finish' }], [canAccount, steps]);
  const [i, setI] = useState(0);
  const [form, setForm] = useState({ name: '', type: 'Bank account', opening_balance: '' });
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState(false);
  const cur = screens[i];
  const last = i === screens.length - 1;
  const set = (k, v) => setForm(o => ({ ...o, [k]: v }));
  const next = () => setI(n => Math.min(n + 1, screens.length - 1));
  const saveAccount = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    const ok = await onCreateAccount({ ...form, opening_balance: Number(form.opening_balance || 0) });
    setBusy(false);
    if (ok !== false) { setMade(true); next(); }
  };
  return <div className="modal-backdrop ww-backdrop" role="dialog" aria-modal="true" aria-label="Welcome to Pocket">
    <div className="ww">
      <button type="button" className="icon-btn ww-x" onClick={() => onClose(false)} aria-label="Skip setup"><X size={16} /></button>
      <div className="ww-dots">{screens.map((s, n) => <i key={s.key} className={n <= i ? 'on' : ''} />)}</div>
      <small className="ww-count">Step {i + 1} of {screens.length}</small>

      {cur.key === 'welcome' && <div className="ww-body"><div className="ww-emoji">👋</div><h2>Welcome{name ? `, ${name}` : ''}!</h2><p>Let’s set up Pocket in a couple of minutes. You can skip anything and come back later.</p></div>}

      {cur.key === 'account' && <div className="ww-body"><div className="ww-emoji">🏦</div><h2>Add your first account</h2><p>Where does your money live?</p>
        <div className="ww-chips">{ACCOUNT_TYPES.map(([t, e]) => <button type="button" key={t} className={form.type === t ? 'on' : ''} onClick={() => set('type', t)}>{e} {t}</button>)}</div>
        <label className="ww-field"><span>Account name</span><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. CIB, Cash, Vodafone Cash" autoFocus /></label>
        <label className="ww-field"><span>Current balance ({currency})</span><input inputMode="decimal" value={form.opening_balance} onChange={e => set('opening_balance', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" /></label></div>}

      {!['welcome', 'account', 'finish'].includes(cur.key) && <div className="ww-body"><div className="ww-emoji">{cur.emoji}</div><h2>{cur.title}</h2><p>{cur.desc}</p>
        <button type="button" className="btn btn-primary ww-cta" onClick={() => { cur.action(); onClose(true); }}>{cur.cta}</button></div>}

      {cur.key === 'finish' && <div className="ww-body"><div className="ww-emoji">🎉</div><h2>You’re all set</h2><p>{made ? 'Your account is ready.' : 'You can finish the rest from the checklist on your Overview.'}</p></div>}

      <div className="ww-foot">
        {i > 0 && !last ? <button type="button" className="btn" onClick={() => setI(n => n - 1)}><ArrowLeft size={15} /> Back</button> : <button type="button" className="btn" onClick={() => onClose(false)}>{last ? '' : 'Skip setup'}</button>}
        {cur.key === 'account' ? <div className="ww-foot-r"><button type="button" className="btn" onClick={next}>Skip</button><button type="button" className="btn btn-primary" disabled={busy || !form.name.trim()} onClick={saveAccount}>{busy ? 'Saving…' : <>Save & next <ArrowRight size={15} /></>}</button></div>
          : last ? <button type="button" className="btn btn-primary" onClick={() => onClose(true)}><Check size={15} /> Start using Pocket</button>
          : <button type="button" className="btn btn-primary" onClick={next}>{cur.key === 'welcome' ? 'Let’s go' : 'Skip this'} <ArrowRight size={15} /></button>}
      </div>
    </div>
  </div>;
}
