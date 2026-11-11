import { useState } from 'react';
import { X } from 'lucide-react';
import { isGoalsAccount } from '../../lib/features.js';
import { isLiability } from '../../lib/credit.js';

export function GoalSpendModal({ goal, saved, expenseCats = [], accounts = [], currency = 'EGP', onClose, onConfirm }) {
  const list = accounts.filter(a => !isGoalsAccount(a) && !isLiability(a));
  const guess = { Travel: 'Travel', Education: 'Education', Home: 'Housing', Car: 'Transportation' }[goal.goal_type];
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(expenseCats.includes(guess) ? guess : (expenseCats.includes('Shopping') ? 'Shopping' : expenseCats[0] || ''));
  const [accountId, setAccountId] = useState(list[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const fmt = n => new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n) || 0);
  const n = Number(amount); const tooMuch = n > saved + 0.005; const ok = n > 0 && !tooMuch && accountId;
  async function go() { if (busy || !ok) return; setBusy(true); try { await onConfirm({ amount: n, category, accountId }); } finally { setBusy(false); } }
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="modal gc-modal" role="dialog" aria-modal="true" aria-labelledby="gsp-title">
      <button type="button" className="icon-btn gc-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
      <p className="eyebrow">SAVINGS GOAL</p>
      <h2 id="gsp-title">Spend from {goal.name}</h2>
      <p className="gc-sub">You have {fmt(saved)} saved in this goal. The goal stays open with what is left.</p>
      <label className="gc-field"><span>Amount spent ({currency})</span><input type="number" inputMode="decimal" min="0" step="0.01" autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></label>
      {tooMuch && <p className="gc-note">That is more than the {fmt(saved)} saved in this goal.</p>}
      <label className="gc-field"><span>Category</span><select value={category} onChange={e => setCategory(e.target.value)}>{expenseCats.map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="gc-field"><span>Paid from</span><select value={accountId} onChange={e => setAccountId(e.target.value)}>{list.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <p className="gc-note">Pocket moves the money out of Goals and records an expense. It is shown as spent from savings, so your net cash flow does not drop.</p>
      <div className="gc-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={busy || !ok} onClick={go}>{busy ? 'Saving…' : 'Record spending'}</button>
      </div>
    </section>
  </div>;
}
