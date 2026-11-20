import { useState } from 'react';
import { ModalShell } from '../../components/modals/ModalShell.jsx';
import { Field } from '../../components/ui/Field.jsx';

export function GoalSpendModal({ goal, saved, expenseCats = [], currency = 'EGP', onClose, onConfirm }) {
  const guess = { Travel: 'Travel', Education: 'Education', Home: 'Housing', Car: 'Transportation' }[goal.goal_type];
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(expenseCats.includes(guess) ? guess : (expenseCats.includes('Shopping') ? 'Shopping' : expenseCats[0] || ''));
  const [busy, setBusy] = useState(false);
  const fmt = n => new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n) || 0);
  const n = Number(amount); const tooMuch = n > saved + 0.005; const ok = n > 0 && !tooMuch;
  async function go() { if (busy || !ok) return; setBusy(true); try { await onConfirm({ amount: n, category }); } finally { setBusy(false); } }
  return <ModalShell title={`Spend from ${goal.name}`} subtitle={`You have ${fmt(saved)} saved in this goal. The goal stays open with what is left.`} onClose={onClose}>
    <div className="form-grid">
      <Field label={`Amount spent (${currency})`} wide><input type="number" inputMode="decimal" min="0" step="0.01" autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" /></Field>
      <Field label="Category" wide><select value={category} onChange={e => setCategory(e.target.value)}>{expenseCats.map(c => <option key={c}>{c}</option>)}</select></Field>
    </div>
    {tooMuch ? <div className="cc-error" role="alert">That is more than the {fmt(saved)} saved in this goal.</div>
      : <p className="small-muted" style={{ margin: '12px 0 0' }}>Recorded as one expense paid from savings. No account changes, and your net cash flow does not drop.</p>}
    <div className="modal-actions" style={{ marginTop: 16 }}><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy || !ok} onClick={go}>{busy ? 'Saving…' : 'Record spending'}</button></div>
  </ModalShell>;
}
