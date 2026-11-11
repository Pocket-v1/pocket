import { isGoalsAccount } from './features.js';

// Money saved for one goal: the manual starting amount plus every transfer tagged with the goal.
export function goalSaved(g, transactions = [], accounts = []) {
  const linked = transactions.filter(t => t.type === 'Transfer' && String(t.goal_id) === String(g.id)).reduce((sum, t) => {
    const from = accounts.find(a => String(a.id) === String(t.account_id));
    const to = accounts.find(a => String(a.id) === String(t.to_account_id));
    if (isGoalsAccount(from)) return sum - Number(t.amount || 0);
    if (isGoalsAccount(to)) return sum + Number(t.amount || 0);
    const fs = String(from?.type || '').toLowerCase().includes('saving');
    const ts = String(to?.type || '').toLowerCase().includes('saving');
    if (fs && !ts) return sum - Number(t.amount || 0);
    if (ts && !fs) return sum + Number(t.amount || 0);
    return sum + Number(t.amount || 0);
  }, 0);
  return Number(g.saved_amount || 0) + linked;
}
export const isGoalDone = g => Boolean(g && g.completed_at);
export const isGoalReached = (g, saved) => Number(g.target_amount) > 0 && saved >= Number(g.target_amount) - 0.005;
// Money already spent out of a goal (expenses tagged with the goal).
export const goalSpent = (g, transactions = []) => transactions.filter(t => t.type === 'Expense' && String(t.goal_id) === String(g.id)).reduce((s, t) => s + Number(t.amount || 0), 0);
export const isFromSavings = t => t.type === 'Expense' && (Boolean(t.goal_id) || String(t.notes || '').startsWith('Goal spent'));
