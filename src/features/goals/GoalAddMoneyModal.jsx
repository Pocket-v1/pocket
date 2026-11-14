import { useState } from 'react';
import { ModalShell } from '../../components/modals/ModalShell.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { isGoalsAccount } from '../../lib/features.js';
import { isLiability } from '../../lib/credit.js';

export function GoalAddMoneyModal({ goal, accounts = [], currency = 'EGP', onClose, onConfirm }) {
  const list = accounts.filter(a => !isGoalsAccount(a) && !isLiability(a));
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('outside');
  const [busy, setBusy] = useState(false);
  const fmt = n => new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n) || 0);
  const ok = Number(amount) > 0;
  async function go() { if (busy || !ok) return; setBusy(true); try { await onConfirm({ amount: Number(amount), source }); } finally { setBusy(false); } }
  return <ModalShell title={`Add money to ${goal.name}`} subtitle="Enter the amount and say where the money is." onClose={onClose}>
    <div className="form-grid">
      <Field label={`Amount (${currency})`} wide><input type="number" inputMode="decimal" min="0" step="0.01" autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" /></Field>
    </div>
    <div className="cc-options" role="radiogroup" aria-label="Where is this money" style={{ marginTop: 14 }}>
      <button type="button" role="radio" aria-checked={source === 'outside'} className={`cc-option ${source === 'outside' ? 'on' : ''}`} onClick={() => setSource('outside')}><span><b>Cash I keep outside Pocket</b><small>No account changes. Not counted in your total balance.</small></span></button>
      {list.map(a => <button type="button" role="radio" key={a.id} aria-checked={String(source) === String(a.id)} className={`cc-option ${String(source) === String(a.id) ? 'on' : ''}`} onClick={() => setSource(a.id)}><span><b>{a.name}</b><small>{ok ? `Balance goes down by ${fmt(amount)}.` : 'Balance goes down by this amount.'}</small></span></button>)}
    </div>
    <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy || !ok} onClick={go}>{busy ? 'Saving…' : 'Add money'}</button></div>
  </ModalShell>;
}
