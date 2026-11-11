import { useEffect, useState } from 'react';
import { CATEGORY_ICONS_EVENT, getCategoryIcon, toIcon } from '../../lib/categoryIcons.js';
import { CATEGORY_ICON_SET } from '../../lib/categoryIconSet.jsx';

const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

// Draws one saved icon value ("ph:Name", or an old emoji) as a Phosphor icon.
export function IconGlyph({ value, size = 22, weight = 'duotone' }) {
  const Ph = CATEGORY_ICON_SET[(toIcon(value) || 'ph:Tag').slice(3)] || CATEGORY_ICON_SET.Tag;
  return <Ph size={size} weight={weight} />;
}

// Icon for a category (or a subcategory when `parent` is given).
export function CategoryIcon({ name, parent, size = 22, animate = true, className = '' }) {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick(v => v + 1); window.addEventListener(CATEGORY_ICONS_EVENT, f); return () => window.removeEventListener(CATEGORY_ICONS_EVENT, f); }, []);
  const h = hash(name);
  return <span className={`cat-emoji ${animate ? `cat-anim-${h % 4}` : ''} ${className}`} style={{ '--d': `${(h % 20) / 10}s` }} aria-hidden="true"><IconGlyph value={getCategoryIcon(name, parent)} size={size} /></span>;
}
