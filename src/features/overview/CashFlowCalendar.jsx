import { CalendarDays, ChevronLeft, ChevronRight } from '../../lib/icons.jsx';
import { useState } from 'react';
import { MonthPicker } from '../../components/ui/MonthPicker.jsx';
import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { localISODate } from '../../lib/format.js';
import { WeekDeck } from './WeekDeck.jsx';
import { cardSummary, isCard } from '../../lib/credit.js';

export function CashFlowCalendar({transactions,recurring,accounts=[],debts=[],month,setMonth,currency}){
 const [picked,setPicked]=useState('');const [yy,mm]=month.split('-').map(Number);const todayKey=localISODate();const selected=picked&&picked.slice(0,7)===month?picked:(todayKey.slice(0,7)===month?todayKey:`${month}-01`);const setSelected=setPicked;const first=new Date(yy,mm-1,1);const days=new Date(yy,mm,0).getDate();const offset=(first.getDay()+6)%7;
 const events={};const add=(date,item)=>{if(!date||date.slice(0,7)!==month)return;(events[date] ||= []).push(item)};
 transactions.forEach(t=>add(t.transaction_date,{kind:t.type==='Income'?'income':'expense',title:t.description||t.category,amount:Number(t.amount||0),label:t.type}));
 accounts.filter(isCard).forEach(c=>cardSummary(c,transactions,undefined,debts).groups.forEach(g=>add(g.due,{kind:'due',title:`${c.name} payment`,amount:g.remaining,label:'Card due'})));
 debts.filter(d=>d.due_date&&Number(d.remaining_amount||0)>0).forEach(d=>add(d.due_date,{kind:'due',title:d.name,amount:Math.min(Number(d.monthly_payment||0),Number(d.remaining_amount||0)),label:'Installment due'}));
 recurring.filter(r=>r.next_due_date).forEach(r=>add(r.next_due_date,{kind:'due',title:r.name,amount:Math.max(0,Number(r.amount||0)-Number(r.paid_amount||0)),label:'Due'}));
 const daysWithEvents=Object.keys(events).length;const dayEvents=events[selected]||[];const fmt=n=>new Intl.NumberFormat('en-EG',{style:'currency',currency,maximumFractionDigits:0}).format(Number(n)||0);
 return <><PageHeading eyebrow="PLAN AHEAD" title="Cash flow calendar" subtitle="See recorded income and spending alongside upcoming recurring due dates." actions={<MonthPicker month={month} setMonth={setMonth}/>}/><WeekDeck events={events} selected={selected} setSelected={setSelected} month={month} todayKey={todayKey} fmt={fmt}/><section className="panel"><div className="panel-header"><div><h2>{selected?new Date(selected+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}):'Select a day'}</h2><p>{dayEvents.length?`${dayEvents.length} scheduled or recorded item${dayEvents.length===1?'':'s'}`:'Choose a day to inspect transactions and due dates.'}</p></div></div>{dayEvents.length?<div className="cfr-list" key={selected}>{dayEvents.map((e,i)=><div className={`cfr-row ${e.kind}`} style={{'--i':i}} key={i}><span className="cfr-ic">{(e.title||'?').trim().charAt(0).toUpperCase()}</span><div className="cfr-info"><b>{e.title}</b><span>{e.label}</span></div><strong className="cfr-amt">{e.kind==='income'?'+':e.kind==='expense'?'−':''}{fmt(e.amount)}</strong></div>)}</div>:<p className="small-muted">No items for this date. Calendar events come from your saved transactions and recurring payment due dates; Pocket does not predict salary dates unless you record them.</p>}</section><p className="small-muted">{daysWithEvents} day{daysWithEvents===1?'':'s'} with activity this month. Recurring due dates are reminders, not automatic payments.</p></>;
}
