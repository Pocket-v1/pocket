// Design system: Field — a label, the control, and an optional one-line hint under it.
export function Field({label,children,wide=false,hint}){return <label className={`field ${wide?'field-wide':''}`}><span>{label}</span>{children}{hint&&<small className="field-hint">{hint}</small>}</label>}
