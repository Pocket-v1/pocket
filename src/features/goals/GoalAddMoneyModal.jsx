import { useState } from 'react';
import { X } from 'lucide-react';
import { isGoalsAccount } from '../../lib/features.js';
import { isLiability } from '../../lib/credit.js';

export function GoalAddMoneyModal({ goal, accounts = [], currency = 'EGP', onClose, onConfirm }) {
  const list = accounts.filter(a => !isGoalsAccount(a) && !isLiability(a));
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('outside');
  const [busy, setBusy] = useState(false);
  const fmt = n => new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n) || 0);
  async function go() { if (busy || !(Number(amount) > 0)) return; setBusy(true); try { await onConfirm({ amount: Number(amount), source }); } finally { setBusy(false); } }
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="modal gc-modal" role="dialog" aria-modal="true" aria-labelledby="gam-title">
      <button type="button" className="icon-btn gc-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
      <p className="eyebrow">SAVINGS GOAL</p>
      <h2 id="gam-title">Add money to {goal.name}</h2>
      <label className="gc-field"><span>Amount ({currency})</span><input type="number" inputMode="decimal" min="0" step="0.01" autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></label>
      <label className="gc-field"><span>Where is this money coming from?</span>
        <select value={source} onChange={e => setSource(e.target.value)}>
          <option value="outside">Cash I hold outside Pocket</option>
          {list.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select></label>
      <p className="gc-note">{source === 'outside' ? `Adds ${fmt(amount)} to this goal and to your Goals account. No other account changes.` : `Moves ${fmt(amount)} from this account into your Goals account, tagged to ${goal.name}.`}</p>
      <div className="gc-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={busy || !(Number(amount) > 0)} onClick={go}>{busy ? 'Saving…' : 'Add money'}</button>
      </div>
    </section>
  </div>;
}
