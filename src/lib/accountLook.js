// Account card look = accent color + style, stored together in the existing `color` text column
// ("#50b99a" = soft card, "#50b99a:solid" = bold gradient card). No database change needed.
export const ACCOUNT_COLORS = [['#5b6cf0', 'Indigo'], ['#3157f6', 'Blue'], ['#0ea5b7', 'Teal'], ['#50b99a', 'Green'], ['#84b83a', 'Lime'], ['#f5b85b', 'Amber'], ['#f08a3c', 'Orange'], ['#ee8291', 'Rose'], ['#d6458a', 'Pink'], ['#8b5cf6', 'Purple'], ['#64748b', 'Slate'], ['#1f2937', 'Charcoal']];
const AUTO = ['#6c7cf5', '#50b99a', '#f5b85b', '#ee8291'];
export const DEFAULT_COLOR = '#6c7cf5'; // legacy default = "auto" (a different tone per card)
export function accountLook(account, index = 0) {
  const raw = String(account?.color || '');
  const [hex0, flag] = raw.split(':');
  const ok = /^#[0-9a-f]{6}$/i.test(hex0 || '');
  const auto = !ok || hex0.toLowerCase() === DEFAULT_COLOR;
  return { hex: auto ? AUTO[index % 4] : hex0, solid: flag === 'solid', auto };
}
export const encodeLook = (hex, solid) => `${hex}${solid ? ':solid' : ''}`;
