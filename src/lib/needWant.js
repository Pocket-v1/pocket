// Default Need / Want for an expense, from its category and subcategory.
// The person's own choices win: picking the other one twice for the same
// category/subcategory makes it their default from then on.
const WANT_CATEGORIES = new Set(['Shopping','Entertainment','Travel','Beauty & Skincare','Hair & Nails','Fashion & Styling','Fitness & Sports','Style & Accessories']);
const WANT_SUBS = new Set(['Food & Groceries|Restaurants','Food & Groceries|Coffee','Food & Groceries|Food delivery','Food & Groceries|Takeaway','Transportation|Ride-hailing']);
const KEY = 'pocket-need-want';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };

export function baseNeedWant(category, subcategory) {
  if (WANT_SUBS.has(`${category}|${subcategory || ''}`)) return 'Want';
  return WANT_CATEGORIES.has(category) ? 'Want' : 'Need';
}

export function defaultNeedWant(category, subcategory) {
  const learned = read()[`${category}|${subcategory || ''}`];
  if (learned && learned.count >= 2) return learned.value;
  return baseNeedWant(category, subcategory);
}

// Call when the person saves an expense whose Need/Want differs from the default.
export function rememberNeedWant(category, subcategory, value) {
  if (!category || !value) return;
  try {
    const all = read(); const k = `${category}|${subcategory || ''}`;
    const base = baseNeedWant(category, subcategory);
    if (value === base) { delete all[k]; }
    else { const cur = all[k]; all[k] = { value, count: cur && cur.value === value ? cur.count + 1 : 1 }; }
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage unavailable */ }
}
