import { useState } from 'react';
import { Check, ShoppingBag, Undo2, X } from 'lucide-react';
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
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="modal gc-modal" role="dialog" aria-modal="true" aria-labelledby="gc-title">
      <button type="button" className="icon-btn gc-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
      <div className="gc-hero">
        <span className="gc-badge"><Check size={30} aria-hidden="true" /></span>
        <p className="eyebrow">GOAL REACHED</p>
        <h2 id="gc-title">{goal.name} is fully funded</h2>
        <b className="gc-amount">{fmt(hasMoney ? saved : goal.target_amount)}</b>
        <span className="gc-sub">{hasMoney ? `left in this goal${spent > 0 ? ` · ${fmt(spent)} already spent` : ''}` : 'all of it is already spent'}</span>
      </div>
      {hasMoney && <>
        <p className="gc-q">What happened?</p>
        <div className="gc-choices" role="radiogroup" aria-label="What happened">
          <button type="button" role="radio" aria-checked={mode === 'paid'} className={`gc-choice ${mode === 'paid' ? 'on' : ''}`} onClick={() => setMode('paid')}>
            <ShoppingBag size={20} aria-hidden="true" /><span><b>I paid for it</b><small>Record {fmt(saved)} as spent and close the goal.</small></span>
          </button>
          <button type="button" role="radio" aria-checked={mode === 'changed'} disabled={!targets.length} className={`gc-choice ${mode === 'changed' ? 'on' : ''}`} onClick={() => setMode('changed')}>
            <Undo2 size={20} aria-hidden="true" /><span><b>I changed my mind</b><small>Close the goal and put the money in an account.</small></span>
          </button>
        </div>
        {mode === 'paid' && expenseCats.length > 0 && <label className="gc-field"><span>Category</span><select value={category} onChange={e => setCategory(e.target.value)}>{expenseCats.map(c => <option key={c}>{c}</option>)}</select></label>}
        {mode === 'changed' && <label className="gc-field"><span>Put the money in</span><select value={accountId} onChange={e => setAccountId(e.target.value)}>{targets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
        {mode === 'changed' && <p className="gc-note">This account goes up by {fmt(saved)}, and the money counts in your total balance again.</p>}
      </>}
      <div className="gc-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Not yet</button>
        <button type="button" className="btn btn-primary" disabled={busy || (hasMoney && mode === 'changed' && !accountId)} onClick={go}>{busy ? 'Saving…' : 'Finish goal'}</button>
      </div>
    </section>
  </div>;
}
