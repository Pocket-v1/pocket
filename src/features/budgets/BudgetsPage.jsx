import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ArrowUpRight, Copy, Pencil, PiggyBank, Plus, Trash2, Wallet } from '../../lib/icons.jsx';
import { MetricCard } from '../../components/ui/MetricCard.jsx';
import { MonthPicker } from '../../components/ui/MonthPicker.jsx';
import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { expenseCategories } from '../../lib/categories.js';
import { budgetMonthView, prevMonth } from '../../lib/budgets.js';
import { fmt, monthLabel, palette } from '../../lib/format.js';

export function BudgetsPage(p){
 const {budgets,transactions,month,setMonth,setModal,setEditing,setToast,removeRecord,setBudgets,requestConfirm,copyBudgets}=p;
 // Rollover: a budget can carry what was left (or overspent) into the next month. See lib/budgets.js.
 const allBudgets=budgetMonthView(budgets,transactions,month,expenseCategories);
 const list=allBudgets.filter(b=>b.id&&(b.amount>0||b.carry!==0));
 const total=list.reduce((s,b)=>s+b.available,0),spent=list.reduce((s,b)=>s+b.spent,0),hasBudgets=list.length>0;
 const last=prevMonth(month),prevSpent=list.reduce((s,b)=>s+b.prevSpent,0);
 const canCopy=!hasBudgets&&typeof copyBudgets==='function'&&budgets.some(b=>(b.month||'').slice(0,7)===last&&Number(b.amount)>0);
 const vsLast=prevSpent>0?` · ${spent>=prevSpent?'+':''}${Math.round((spent-prevSpent)/prevSpent*100)}% vs ${monthLabel(last)}`:'';
 return <><PageHeading eyebrow="PLAN WITH PURPOSE" title="Budgets" subtitle="Give every pound a plan, without losing flexibility." actions={<><MonthPicker month={month} setMonth={setMonth}/>{canCopy&&<button className="btn btn-secondary" type="button" onClick={()=>copyBudgets(last,month)}><Copy size={16}/> Copy {monthLabel(last)}</button>}<button className="btn btn-primary" onClick={()=>{setEditing(null);setModal('budget')}}><Plus size={17}/> Set budget</button></>}/>
 <div className="metric-grid three"><MetricCard label="Planned budget" value={fmt(total)} icon={Wallet} tone="blue" note={monthLabel(month)}/><MetricCard label="Spent so far" value={fmt(spent)} icon={ArrowUpRight} tone="orange" note={hasBudgets?`${total?Math.round(spent/total*100):0}% of budget · budgeted categories${vsLast}`:'in budgeted categories'}/><MetricCard label="Remaining" value={hasBudgets?fmt(total-spent):'—'} icon={PiggyBank} tone="green" note={!hasBudgets?'Set a budget to start':spent>total?'Over budget':'Available to spend'}/></div>
 {!hasBudgets&&<EmptyState panel icon={PiggyBank} title="No budgets for this month yet" text="Set a monthly limit for a category and Pocket will track it against your spending." action={()=>{setEditing(null);setModal('budget')}} actionLabel="Set your first budget"/>}
 <div className="budget-grid">{list.map((b,i)=><div className="panel budget-card" key={b.category}><div className="budget-card-head"><span className="category-color" style={{background:palette[i%palette.length]}}/><div><b>{b.category}</b><small>{b.amount?`${fmt(b.amount)} monthly limit`:'No budget set'}{b.carry!==0?` · ${b.carry>0?'+':'−'}${fmt(Math.abs(b.carry))} from ${monthLabel(last)}`:''}{b.rollover?' · rolls over':''}</small></div><div className="row-actions"><button className="icon-btn" title="Edit budget" aria-label={`Edit ${b.category} budget`} onClick={()=>{setEditing(b);setModal('budget')}}><Pencil size={15}/></button>{b.id&&<button className="icon-btn danger-hover" title="Clear budget" aria-label={`Clear ${b.category} budget`} onClick={()=>requestConfirm('Clear this budget?', `Remove the ${b.category} budget for ${monthLabel(month)}? Your transactions will not be deleted.`, ()=>removeRecord('budgets',b.id,setBudgets,budgets), 'Clear budget')}><Trash2 size={15}/></button>}</div></div><div className="budget-numbers"><b>{fmt(b.spent)}</b><span>{b.available?`of ${fmt(b.available)}`:'spent'}</span></div><div className="progress-track"><span style={{width:`${Math.min(100,b.used)}%`,background:b.used>=100?'#e66f78':b.used>=80?'#f1b15d':palette[i%palette.length]}}/></div><div className="budget-card-foot"><span className={b.used>=100?'text-danger':b.used>=80?'text-warn':'text-muted'}>{b.amount?(b.used>=100?'Over budget':b.used>=80?'Near limit':'On track'):'Set a limit'}</span><b>{b.amount?`${Math.round(b.used)}%`:''}</b></div></div>)}</div></>;
}
