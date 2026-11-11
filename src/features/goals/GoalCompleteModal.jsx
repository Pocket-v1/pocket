import { useState } from 'react';
import { Check } from 'lucide-react';
import { ModalShell } from '../../components/modals/ModalShell.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { isGoalsAccount } from '../../lib/features.js';
import { isLiability } from '../../lib/credit.js';

export function GoalCompleteModal({ goal, saved, spent = 0, expenseCats = [], accounts = [], currency = 'EGP', onClose, onConfirm }) {
  const targets = accounts.filter(a => !isGoalsAccount(a) && !isLiability(a));
  const hasMoney = saved > 0.005;
  const [mode, setMode] = useState('paid');
  const [accountId, setAccountId] = useState(targets[0]?.id || '');
  const guess = { Travel: 'Travel', Education: 'Education', Home: 'Housing', Car: 'Transportation' }[goal.goal_type];
  const [category, setCategory] = useState(expenseCats.includes(guess) ? guess : (expenseCats.includes('Shopping') ? 'Shopping' : expenseCats[0] || ''));
  const [busy, setBusy] = useState(false);
  const fmt = n => new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n) || 0);
  async function go() { if (busy) return; setBusy(true); try { await onConfirm({ mode, accountId, amount: saved, category }); } finally { setBusy(false); } }
  return <ModalShell title={`${goal.name} is fully funded`} subtitle={hasMoney ? 'Tell Pocket what happened, and the goal is closed.' : 'All of it is already spent. You can close the goal.'} onClose={onClose}>
    <div className="goal-finish-hero">
      <span className="goal-finish-badge"><Check size={26} aria-hidden="true" /></span>
      <div><b>{fmt(hasMoney ? saved : goal.target_amount)}</b><small>{hasMoney ? `left in this goal${spent > 0 ? ` · ${fmt(spent)} already spent` : ''}` : 'spent from this goal'}</small></div>
    </div>
    {hasMoney && <>
      <div className="cc-options" role="radiogroup" aria-label="What happened">
        <button type="button" role="radio" aria-checked={mode === 'paid'} className={`cc-option ${mode === 'paid' ? 'on' : ''}`} onClick={() => setMode('paid')}><span><b>I paid for it</b><small>Record {fmt(saved)} as spent and close the goal.</small></span></button>
        <button type="button" role="radio" aria-checked={mode === 'changed'} disabled={!targets.length} className={`cc-option ${mode === 'changed' ? 'on' : ''}`} onClick={() => setMode('changed')}><span><b>I changed my mind</b><small>Close the goal and put the money in an account.</small></span></button>
      </div>
      <div className="form-grid">
        {mode === 'paid' && expenseCats.length > 0 && <Field label="Category" wide><select value={category} onChange={e => setCategory(e.target.value)}>{expenseCats.map(c => <option key={c}>{c}</option>)}</select></Field>}
        {mode === 'changed' && <Field label="Put the money in" wide><select value={accountId} onChange={e => setAccountId(e.target.value)}>{targets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
      </div>
      {mode === 'changed' && <p className="small-muted" style={{ margin: '12px 0 0' }}>This account goes up by {fmt(saved)}, and the money counts in your total balance again.</p>}
    </>}
    <div className="modal-actions" style={{ marginTop: 16 }}><button type="button" className="btn btn-secondary" onClick={onClose}>Not yet</button><button type="button" className="btn btn-primary" disabled={busy || (hasMoney && mode === 'changed' && !accountId)} onClick={go}>{busy ? 'Saving…' : 'Finish goal'}</button></div>
  </ModalShell>;
}
