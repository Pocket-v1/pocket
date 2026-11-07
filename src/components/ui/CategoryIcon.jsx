import { useEffect, useState } from 'react';
import { CATEGORY_ICONS_EVENT, getCategoryIcon } from '../../lib/categoryIcons.js';

const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

// Animated emoji icon for a category (or a subcategory when `parent` is given).
export function CategoryIcon({ name, parent, size = 22, animate = true, className = '' }) {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick(v => v + 1); window.addEventListener(CATEGORY_ICONS_EVENT, f); return () => window.removeEventListener(CATEGORY_ICONS_EVENT, f); }, []);
  const h = hash(name);
  return <span className={`cat-emoji ${animate ? `cat-anim-${h % 4}` : ''} ${className}`} style={{ fontSize: size, '--d': `${(h % 20) / 10}s` }} aria-hidden="true">{getCategoryIcon(name, parent)}</span>;
}
