import { useState } from 'react';
import { PartyPopper, Wallet, PiggyBank, Receipt, X } from 'lucide-react';
import { isGoalsAccount } from '../../lib/features.js';
import { isLiability } from '../../lib/credit.js';

export function GoalCompleteModal({ goal, saved, backed = 0, expenseCats = [], accounts = [], currency = 'EGP', onClose, onConfirm }) {
  const targets = accounts.filter(a => !isGoalsAccount(a) && !isLiability(a));
  const [mode, setMode] = useState(saved > 0 && targets.length ? (backed > 0 ? 'move' : 'spend') : 'keep');
  const [accountId, setAccountId] = useState(targets[0]?.id || '');
  const guess = { Travel: 'Travel', Education: 'Education', Home: 'Housing', Car: 'Transportation' }[goal.goal_type];
  const [category, setCategory] = useState(expenseCats.includes(guess) ? guess : (expenseCats.includes('Other') ? 'Other' : expenseCats[0] || ''));
  const [busy, setBusy] = useState(false);
  const fmt = n => new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n) || 0);
  async function go() { if (busy) return; setBusy(true); try { await onConfirm({ mode, accountId, amount: saved, backed, category }); } finally { setBusy(false); } }
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="modal gc-modal" role="dialog" aria-modal="true" aria-labelledby="gc-title">
      <button type="button" className="icon-btn gc-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
      <div className="gc-hero">
        <span className="gc-badge"><PartyPopper size={30} aria-hidden="true" /></span>
        <p className="eyebrow">GOAL REACHED</p>
        <h2 id="gc-title">You did it. {goal.name} is fully funded.</h2>
        <b className="gc-amount">{fmt(saved)}</b>
        <span className="gc-sub">of {fmt(goal.target_amount)} target</span>
      </div>
      <p className="gc-q">What should happen to this money?</p>
      <div className="gc-choices" role="radiogroup" aria-label="What to do with the money">
        <button type="button" role="radio" aria-checked={mode === 'move'} disabled={!targets.length || !(saved > 0)} className={`gc-choice ${mode === 'move' ? 'on' : ''}`} onClick={() => setMode('move')}>
          <Wallet size={20} aria-hidden="true" /><span><b>Move it to an account</b><small>Ready to spend. Goals balance goes down.</small></span>
        </button>
        <button type="button" role="radio" aria-checked={mode === 'spend'} disabled={!targets.length || !(saved > 0)} className={`gc-choice ${mode === 'spend' ? 'on' : ''}`} onClick={() => setMode('spend')}>
          <Receipt size={20} aria-hidden="true" /><span><b>Spend it (record an expense)</b><small>Adds an expense transaction for {fmt(saved)}.</small></span>
        </button>
        <button type="button" role="radio" aria-checked={mode === 'keep'} className={`gc-choice ${mode === 'keep' ? 'on' : ''}`} onClick={() => setMode('keep')}>
          <PiggyBank size={20} aria-hidden="true" /><span><b>Keep it in Goals</b><small>Just close the goal. The money stays saved.</small></span>
        </button>
      </div>
      {mode === 'spend' && expenseCats.length > 0 && <label className="gc-field"><span>Category</span><select value={category} onChange={e => setCategory(e.target.value)}>{expenseCats.map(c => <option key={c}>{c}</option>)}</select></label>}
      {(mode === 'move' || mode === 'spend') && <label className="gc-field"><span>{mode === 'move' ? 'Move to' : 'Paid from'}</span><select value={accountId} onChange={e => setAccountId(e.target.value)}>{targets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
      {(mode === 'move' || mode === 'spend') && backed < saved - 0.005 && <p className="gc-note">{fmt(saved - backed)} of this was added by hand as a starting amount, so it is not inside the Goals account balance.{mode === 'move' ? ` Only ${fmt(backed)} can be moved.` : ' It is paid from the account you choose.'}</p>}
      <div className="gc-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Not yet</button>
        <button type="button" className="btn btn-primary" disabled={busy || ((mode === 'move' || mode === 'spend') && !accountId)} onClick={go}>{busy ? 'Saving…' : 'Complete goal'}</button>
      </div>
    </section>
  </div>;
}
