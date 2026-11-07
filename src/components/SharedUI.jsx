import { AnimatedNumber } from './ui/AnimatedNumber.jsx';
import React from 'react';
import { CalendarDays, Check, CircleDollarSign, Wallet, ArrowLeftRight, FileSpreadsheet, CircleHelp, CreditCard, Sparkles, Target, ArrowUpRight, PiggyBank, Settings, UserRound, FileJson, ChartNoAxesCombined } from 'lucide-react';
import { PROFILE_AVATARS } from '../lib/domain.js';

function ProfileAvatar({value,className=''}){const isRemotePhoto=typeof value==='string'&&/^https?:\/\//i.test(value);const avatar=PROFILE_AVATARS.find(a=>a.id===value)||PROFILE_AVATARS[0];return <img className={`profile-avatar-image ${className}`} src={isRemotePhoto?value:avatar.src} alt="Profile avatar" referrerPolicy="no-referrer" onError={e=>{if(isRemotePhoto){e.currentTarget.onerror=null;e.currentTarget.src=avatar.src;}}}/>;}

function PageHeading({eyebrow,title,subtitle,actions,className=''}){const isGreeting=className.includes('greeting-heading')||(typeof title==='string'&&/^(Good morning|Good afternoon|Good evening)/.test(title));return <div className={`page-heading ${className}${isGreeting?' greeting-heading':''}`}><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div><div className="heading-actions">{actions}</div></div>}

function MonthPicker({month,setMonth}){return <div className="month-picker"><CalendarDays size={16}/><span className="month-picker-label">{(()=>{const [y,m]=String(month||'').split('-');return y&&m?new Date(Number(y),Number(m)-1,1).toLocaleDateString('en-US',{month:'short',year:'numeric'}):'Select month'})()}</span><input aria-label="Selected month" type="month" value={month} onChange={e=>setMonth(e.target.value)}/></div>}

function MetricCard({label,value,change,icon:Icon,tone='blue',note}){return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={18}/></span></div><div className="metric-value"><AnimatedNumber value={value}/></div><div className="metric-foot">{change&&<span className={change.startsWith('+')?'positive':'neutral'}>{change}</span>}<span>{note}</span></div></div>}

function EmptyState({icon:Icon,title,text,action,actionLabel}){return <div className="empty-state"><div className="empty-icon"><Icon size={21}/></div><b>{title}</b><p>{text}</p>{action&&<button className="btn btn-secondary btn-sm" onClick={action}>{actionLabel||'Add new'}</button>}</div>}

function WizardProgress({step,total=3,labels}){return <div className="tx-wizard-progress"><div className="tx-wizard-steps">{labels.map((label,i)=><div key={label} className={`tx-wizard-step ${step===i+1?'active':step>i+1?'complete':''}`}><span>{step>i+1?<Check size={14}/>:i+1}</span><b>{label}</b></div>)}</div><div className="tx-wizard-track" aria-hidden="true">{Array.from({length:total},(_,i)=><span key={i} className={step>i?'on':''}/>)}</div></div>}

function ChoiceCards({items,value,onChange,columns=3}){return <div className="tx-category-grid" style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}}>{items.map(item=><button type="button" key={item.value} className={`tx-choice-card ${value===item.value?'selected':''}`} onClick={()=>onChange(item.value)}><span className="tx-choice-icon">{item.icon||<CircleDollarSign size={17}/>}</span><span className="tx-choice-label">{item.label}</span>{item.description&&<small>{item.description}</small>}{value===item.value&&<span className="tx-choice-check"><Check size={13}/></span>}</button>)}</div>}

function Field({label,children,wide=false}){return <label className={`field ${wide?'field-wide':''}`}><span>{label}</span>{children}</label>}

function CategoryGlyph({name}){const icons={'house':<Wallet size={17}/>, 'shopping-basket':<CircleDollarSign size={17}/>, 'car-front':<ArrowLeftRight size={17}/>, 'receipt':<FileSpreadsheet size={17}/>, 'heart-pulse':<CircleHelp size={17}/>, 'shopping-bag':<CreditCard size={17}/>, 'clapperboard':<Sparkles size={17}/>, 'graduation-cap':<Target size={17}/>, 'plane':<ArrowUpRight size={17}/>, 'piggy-bank':<PiggyBank size={17}/>, 'gift':<Sparkles size={17}/>, 'sparkles':<Sparkles size={17}/>, 'scissors':<Settings size={17}/>, 'heart':<CircleHelp size={17}/>, 'shirt':<UserRound size={17}/>, 'user-round':<UserRound size={17}/>, 'dumbbell':<Target size={17}/>, 'laptop':<FileJson size={17}/>, 'briefcase-business':<Wallet size={17}/>, 'chart-no-axes-combined':<ChartNoAxesCombined size={17}/>, 'circle-dollar-sign':<CircleDollarSign size={17}/>, 'shapes':<CircleHelp size={17}/>};return icons[name]||<CircleHelp size={17}/>}

export { ProfileAvatar, PageHeading, MonthPicker, MetricCard, EmptyState, WizardProgress, ChoiceCards, Field, CategoryGlyph };
