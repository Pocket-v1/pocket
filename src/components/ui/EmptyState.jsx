export function EmptyState({icon:Icon,title,text,action,actionLabel,children,panel=false,inline=false}){
 return <div className={`empty-state${panel?' panel':''}${inline?' is-inline':''}`}>{Icon&&<div className="empty-icon"><Icon size={inline?20:24}/></div>}<b>{title}</b>{text&&<p>{text}</p>}{action&&<button className="btn btn-secondary btn-sm" onClick={action}>{actionLabel||'Add new'}</button>}{children}</div>;
}
