import { AnimatedNumber } from './AnimatedNumber.jsx';


export function MetricCard({label,value,change,icon:Icon,tone='blue',note}){return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={18}/></span></div><div className="metric-value"><AnimatedNumber value={value}/></div><div className="metric-foot">{change&&<span className={change.startsWith('+')?'positive':'neutral'}>{change}</span>}<span>{note}</span></div></div>}
