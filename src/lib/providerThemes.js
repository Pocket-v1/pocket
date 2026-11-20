import halanFace from '../assets/cards/halan-card.svg';
import valuLogo from '../assets/cards/valu.svg';
import amanLogo from '../assets/cards/aman.webp';
import souhoolaLogo from '../assets/cards/souhoola.webp';
import contactLogo from '../assets/cards/contact.webp';
import symplLogo from '../assets/cards/sympl.webp';
import forsaLogo from '../assets/cards/forsa.webp';
import premiumLogo from '../assets/cards/premium-card.webp';

// Card looks for installment apps. Brand colors, plus the logo / card image files supplied by the app owner.
// `face` = full card artwork (SVG supplied by the app owner) used as the whole card; `accent` = optional swoosh color; `logo` = a logo shown on a white plate over the brand-colored card.
export const PROVIDER_THEMES = {
  Valu: { a: '#00b3a4', b: '#064e4a', logo: valuLogo },
  Aman: { a: '#19b0c9', b: '#0a5f73', logo: amanLogo },
  Souhoola: { a: '#7a2cf0', b: '#2e0a6b', logo: souhoolaLogo },
  Contact: { a: '#2e3180', b: '#14153f', logo: contactLogo },
  Sympl: { a: '#ff3b5c', b: '#8a1030', logo: symplLogo },
  Halan: { a: '#1a1a1a', b: '#000', face: halanFace },
  Forsa: { a: '#12b3a8', b: '#0b1f5c', logo: forsaLogo },
  Shahry: { a: '#e0561d', b: '#7a1d0c' },
  Mogo: { a: '#0e8f5a', b: '#063b2a' },
  Klivvr: { a: '#1f1f2e', b: '#6d3fe0' },
  Seven: { a: '#d6336c', b: '#5b0f2e' },
  TRU: { a: '#0a7ea4', b: '#062c3f' },
  Mylo: { a: '#e8a317', b: '#7a4a05' },
  'Premium Card': { a: '#d8232a', b: '#16161a', logo: premiumLogo },
};
const clean = s => String(s || '').trim().toLowerCase();
export function providerTheme(account) {
  const hit = Object.keys(PROVIDER_THEMES).find(k => clean(k) === clean(account?.name));
  if (hit) return { ...PROVIDER_THEMES[hit], preset: hit };
  const c = account?.color || '#3157f6';
  return { a: c, b: `color-mix(in srgb,${c} 55%,#0b1033)`, preset: null };
}
