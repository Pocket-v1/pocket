// Design-system switch row: a title, an optional line of help, and an on/off switch.
// Usage: <Toggle label="Leave out of totals" hint="…" checked={v} onChange={setV} />
export function Toggle({ label, hint, checked = false, onChange, compact = false, className = '' }) {
  return <button type="button" role="switch" aria-checked={checked} className={`ds-toggle ${checked ? 'on' : ''} ${compact ? 'compact' : ''} ${className}`} onClick={() => onChange?.(!checked)}>
    <span className="ds-toggle-text"><b>{label}</b>{hint && <small>{hint}</small>}</span>
    <span className="ds-toggle-switch" aria-hidden="true"><i /></span>
  </button>;
}
