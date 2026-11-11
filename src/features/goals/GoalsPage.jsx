import { useState } from 'react';
import { CalendarDays, ChevronDown, Pencil, PiggyBank, Plus, ShoppingBag, RotateCcw, Target, Trash2, TrendingUp, Trophy } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { MetricCard } from '../../components/ui/MetricCard.jsx';
import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { goalSaved, goalSpent, isGoalDone, isGoalReached } from '../../lib/goals.js';
import { fmt, palette, shortDate } from '../../lib/format.js';

export function GoalsPage(p){
 const {goals,transactions=[],accounts=[],setModal,setEditing,removeRecord,setGoals,requestConfirm,onCompleteGoal,onReopenGoal,onAddMoney,onSpend}=p;
 const [showDone,setShowDone]=useState(false);
 const active=goals.filter(g=>!isGoalDone(g));
 const done=goals.filter(isGoalDone);
 const savedOf=g=>goalSaved(g,transactions,accounts);
 const goalTarget=active.reduce((s,g)=>s+Number(g.target_amount||0),0);
 const totalSaved=active.reduce((s,g)=>s+savedOf(g)+goalSpent(g,transactions),0);
 return <><PageHeading eyebrow="FUTURE YOU WILL THANK YOU" title="Savings goals" subtitle="Turn the things you want into a plan you can follow." actions={<button className="btn btn-primary" onClick={()=>{setEditing(null);setModal('goal')}}><Plus size={17}/> New goal</button>}/>
 <div className="metric-grid three"><MetricCard label="Total target" value={fmt(goalTarget)} icon={Target} tone="purple" note="across active goals"/><MetricCard label="Already saved" value={fmt(totalSaved)} icon={PiggyBank} tone="green" note="saved so far"/><MetricCard label="Still to save" value={fmt(Math.max(0,goalTarget-totalSaved))} icon={TrendingUp} tone="blue" note="to reach your goals"/></div>
 <div className="goal-grid">{active.map((g,i)=>{
  const savedAmount=savedOf(g);const spent=goalSpent(g,transactions);const reached=isGoalReached(g,savedAmount+spent);
  const progress=Math.min(100,Math.round((savedAmount+spent)/(Number(g.target_amount)||1)*100));const remaining=Math.max(0,Number(g.target_amount)-savedAmount-spent);
  const months=g.target_date?Math.max(1,(new Date(g.target_date).getFullYear()-new Date().getFullYear())*12+new Date(g.target_date).getMonth()-new Date().getMonth()):null;
  return <div className={`panel goal-card ${reached?'is-reached':''}`} key={g.id}>
   <div className="goal-card-top"><div className={`goal-big-icon goal-tone-${i%4}`}>{reached?<Trophy size={22}/>:<Target size={22}/>}</div><div className="goal-menu">{reached&&<span className="goal-reached-pill"><Trophy size={12} aria-hidden="true"/> Goal reached</span>}<button className="icon-btn" aria-label={`Edit ${g.name}`} onClick={()=>{setEditing(g);setModal('goal')}}><Pencil size={15}/></button><button className="icon-btn danger-hover" aria-label={`Delete ${g.name}`} onClick={()=>requestConfirm('Delete savings goal?', `Delete “${g.name}”? This cannot be undone.`, ()=>removeRecord('savings_goals',g.id,setGoals,goals))}><Trash2 size={15}/></button></div></div>
   <h3>{g.name}</h3><p className="goal-deadline">{g.target_date?`Target date · ${shortDate(g.target_date)}`:'No target date set'}</p>
   <div className="goal-amounts"><div><span>{spent>0?'In the goal now':'Saved so far'}</span><b>{fmt(savedAmount)}</b>{spent>0&&<small className="goal-spent">+ {fmt(spent)} already spent</small>}</div><div><span>Target amount</span><b>{fmt(g.target_amount)}</b></div></div>
   <div className="progress-track big"><span style={{width:`${progress}%`,background:reached?'var(--ds-ok)':palette[i%palette.length]}}/></div>
   <div className="progress-caption"><span>{progress}% complete</span><span>{reached?'Fully funded':`${fmt(remaining)} to go`}</span></div>
   {reached
    ?<button type="button" className="goal-complete-btn" onClick={()=>onCompleteGoal(g,savedAmount)}><Trophy size={16} aria-hidden="true"/> Finish this goal</button>
    :<><div className="goal-btn-row"><button type="button" className="goal-add-btn" onClick={()=>onAddMoney(g)}><Plus size={15} aria-hidden="true"/> Add money</button>{savedAmount>0.005&&<button type="button" className="goal-add-btn" onClick={()=>onSpend(g,savedAmount)}><ShoppingBag size={15} aria-hidden="true"/> Spend</button>}</div><div className="goal-footer"><span><CalendarDays size={14}/>{months?`${months} months left`:'Flexible timeline'}</span><b>{months?`${fmt(remaining/months)}/mo`:'—'}</b></div></>}
   {g.notes&&<p className="goal-note">{g.notes}</p>}
  </div>})}
 {goals.length===0&&<div className="panel empty-large"><EmptyState icon={Target} title="Every goal starts somewhere" text="Create your first savings goal and watch your progress grow." action={()=>{setEditing(null);setModal('goal')}} actionLabel="Create a goal"/></div>}</div>
 {done.length>0&&<section className="goal-done" aria-label="Completed goals">
  <button type="button" className="goal-done-head" aria-expanded={showDone} onClick={()=>setShowDone(v=>!v)}><span><Trophy size={16} aria-hidden="true"/> Completed goals <b>{done.length}</b></span><ChevronDown size={18} aria-hidden="true" className={showDone?'open':''}/></button>
  {showDone&&<div className="goal-done-list">{done.map(g=><div className="goal-done-row" key={g.id}><span className="goal-done-icon"><Trophy size={16} aria-hidden="true"/></span><div><b>{g.name}</b><small>{fmt(g.target_amount)} · Completed {shortDate(String(g.completed_at).slice(0,10))}</small></div><button type="button" className="btn btn-secondary btn-sm" onClick={()=>onReopenGoal(g)}><RotateCcw size={14} aria-hidden="true"/> Reopen</button></div>)}</div>}
 </section>}</>;
}
