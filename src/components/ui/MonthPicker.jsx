import { CalendarDays } from '../../lib/icons.jsx';

export function MonthPicker({month,setMonth}){return <div className="month-picker"><CalendarDays size={16}/><span className="month-picker-label">{(()=>{const [y,m]=String(month||'').split('-');return y&&m?new Date(Number(y),Number(m)-1,1).toLocaleDateString('en-US',{month:'short',year:'numeric'}):'Select month'})()}</span><input aria-label="Selected month" type="month" value={month} onChange={e=>setMonth(e.target.value)}/></div>}
