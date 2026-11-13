// Design system: Tabs (segmented). The ONE tab style in Pocket — use it for every page or popup with sections.
// items: [{key, label, count?}]  value: active key  onChange(key)
// Styles: .ds-tabs in src/design-system/components.css
export function Tabs({ items, value, onChange, label, className = '' }) {
  return <div className={`ds-tabs ${className}`.trim()} role="tablist" aria-label={label}>
    {items.map(it => <button key={it.key} type="button" role="tab" aria-selected={value === it.key} className={value === it.key ? 'on' : ''} onClick={() => onChange(it.key)}>
      <span className="ds-tabs-label">{it.label}</span>{it.count > 0 && <span className="ds-tabs-count">{it.count}</span>}
    </button>)}
  </div>;
}
