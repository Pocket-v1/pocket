import { useState } from 'react';
import { toIcon } from '../../lib/categoryIcons.js';
import { CATEGORY_ICON_GROUPS, CATEGORY_ICON_SET } from '../../lib/categoryIconSet.jsx';
import { IconGlyph } from './CategoryIcon.jsx';

// Phosphor icon picker for categories: the chosen icon, group tabs and a grid. Value is "ph:IconName".
export function EmojiPicker({ value, onChange }) {
  const current = toIcon(value) || 'ph:Tag';
  const [tab, setTab] = useState(() => Math.max(0, CATEGORY_ICON_GROUPS.findIndex(([, list]) => list.includes(current.slice(3)))));
  return <div className="emoji-picker">
    <div className="emoji-custom"><span className="emoji-current" aria-label="Selected icon"><IconGlyph value={current} size={26} /></span><small className="small-muted">Pick an icon below</small></div>
    <div className="emoji-tabs" role="tablist">{CATEGORY_ICON_GROUPS.map(([g], i) => <button type="button" role="tab" aria-selected={tab === i} className={tab === i ? 'on' : ''} key={g} onClick={() => setTab(i)}>{g}</button>)}</div>
    <div className="emoji-grid" role="listbox" aria-label="Icons">{CATEGORY_ICON_GROUPS[tab][1].map(n => { const Ph = CATEGORY_ICON_SET[n]; const v = `ph:${n}`; return <button type="button" key={n} role="option" aria-label={n} aria-selected={current === v} className={current === v ? 'on' : ''} onClick={() => onChange(v)}><Ph size={22} /></button>; })}</div>
  </div>;
}
