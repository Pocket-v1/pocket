// One shared emoji-icon system for categories and subcategories.
// Choices are saved in the user's cloud settings (settings.categoryIcons), so they follow the account.
// Keys: "Category" for a category, "Category::Sub" for a subcategory.
let overrides = {};
const EVT = 'pocket-category-icons-updated';
export const setCategoryIconOverrides = obj => { overrides = obj && typeof obj === 'object' ? { ...obj } : {}; try { window.dispatchEvent(new Event(EVT)); } catch { /* ignore */ } };
export const CATEGORY_ICONS_EVENT = EVT;
export const iconKey = (name, parent) => parent ? `${parent}::${name}` : String(name || '');

const RULES = [
  [/housing|home|house|rent|mortgage/, '🏠'], [/grocer|supermarket/, '🛒'], [/food|dining|restaurant|meal|cafe|coffee/, '🍔'],
  [/transport|taxi|uber|metro|bus/, '🚌'], [/fuel|petrol|gas station/, '⛽'], [/car|vehicle|auto|parking|gear/, '🚗'],
  [/bill|util|electric|water|internet|wifi/, '💡'], [/phone|mobile|recharge/, '📱'], [/health|medic|pharm|doctor|clinic|dental/, '🩺'],
  [/shop|cloth|fashion|style|accessor/, '🛍️'], [/entertain|fun|leisure|cinema|movie|game/, '🎮'], [/educ|school|course|learn|book|tuition/, '🎓'],
  [/travel|trip|holiday|vacation|flight|hotel/, '✈️'], [/saving|invest|debt|loan/, '💰'], [/family|giving|charity|gift|donat/, '🎁'],
  [/beauty|skin|makeup/, '💄'], [/hair|nail|salon/, '💅'], [/period|personal care|groom/, '🧴'], [/fit|sport|gym/, '🏋️'],
  [/pet|dog|cat/, '🐾'], [/insur/, '🛡️'], [/subscr|netflix|spotify/, '🔁'], [/tax|fee|fine/, '🧾'], [/tech|laptop|electron/, '💻'],
  [/salary|wage|payroll/, '💼'], [/freelance/, '🧑‍💻'], [/business/, '🏢'], [/bonus/, '🎉'], [/invest/, '📈'], [/other income/, '💵'], [/other/, '✨'],
];
export function defaultIcon(name, parent) {
  const n = String(name || '').toLowerCase();
  const hit = RULES.find(([r]) => r.test(n));
  if (hit) return hit[1];
  if (parent) return defaultIcon(parent);
  return '🏷️';
}
export function getCategoryIcon(name, parent) {
  return overrides[iconKey(name, parent)] || (parent && overrides[parent] && !RULES.some(([r]) => r.test(String(name).toLowerCase())) ? overrides[parent] : null) || defaultIcon(name, parent);
}
export const hasCustomIcon = (name, parent) => Boolean(overrides[iconKey(name, parent)]);

export async function saveCategoryIcon(supabase, uid, key, emoji) {
  const next = { ...overrides };
  if (emoji) next[key] = emoji; else delete next[key];
  setCategoryIconOverrides(next);
  if (!supabase || !uid) return;
  try {
    const { data } = await supabase.from('user_settings').select('settings').eq('user_id', uid).maybeSingle();
    const preserved = data?.settings && typeof data.settings === 'object' ? data.settings : {};
    await supabase.from('user_settings').upsert({ user_id: uid, settings: { ...preserved, categoryIcons: next }, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  } catch (e) { console.error('Could not save category icon', e?.message); }
}
export async function renameCategoryIconKeys(supabase, uid, from, to) {
  const next = {}; let changed = false;
  for (const [k, v] of Object.entries(overrides)) {
    if (k === from) { next[to] = v; changed = true; }
    else if (k.startsWith(`${from}::`)) { next[`${to}::${k.slice(from.length + 2)}`] = v; changed = true; }
    else next[k] = v;
  }
  if (!changed) return;
  setCategoryIconOverrides(next);
  if (!supabase || !uid) return;
  try {
    const { data } = await supabase.from('user_settings').select('settings').eq('user_id', uid).maybeSingle();
    const preserved = data?.settings && typeof data.settings === 'object' ? data.settings : {};
    await supabase.from('user_settings').upsert({ user_id: uid, settings: { ...preserved, categoryIcons: next }, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  } catch { /* ignore */ }
}

// First emoji typed/pasted from any keyboard, or ''.
export function firstEmoji(text) {
  const s = String(text || '').trim(); if (!s) return '';
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].map(x => x.segment) : Array.from(s);
  return seg.find(g => /\p{Extended_Pictographic}|\p{Regional_Indicator}|[\u{1F3FB}-\u{1F3FF}]|[#*0-9]️?⃣/u.test(g)) || '';
}

const e = s => s.split(/\s+/).filter(Boolean);
export const EMOJI_GROUPS = [
  ['Money', e('💰 💵 💳 🏦 💸 🪙 💎 🧾 📈 📉 🏧 💹 🤑 🧮 🪪 💲 🏷️ 🧧 💱 🏛️')],
  ['Food', e('🍔 🍕 🍟 🌭 🥪 🌮 🍗 🍖 🥩 🍣 🍜 🍝 🥗 🍳 🥞 🧇 🥐 🍞 🧀 🥚 🍎 🍌 🍇 🍉 🍓 🥑 🥦 🥕 🌽 🍩 🍪 🍰 🎂 🍫 🍿 ☕ 🍵 🧋 🥤 🍺 🍷 🍹 🛒 🥖 🍚 🥙')],
  ['Home', e('🏠 🏡 🏢 🛋️ 🛏️ 🚿 🛁 🧹 🧺 🧼 🧽 🔑 🚪 🪑 💡 🔌 🪟 🧯 🪴 🛠️ 🔧 🔨 🧰 🪜 📺 🧊 🍽️ 🪞')],
  ['Transport', e('🚗 🚕 🚙 🚌 🚎 🚓 🚑 🚒 🚚 🏍️ 🛵 🚲 🛴 🚆 🚇 🚊 ✈️ 🛫 🚁 🚢 ⛵ ⛽ 🅿️ 🛞 🚦 🛣️ 🚀 🛺')],
  ['Health', e('🩺 💊 💉 🩹 🏥 🦷 👓 🧬 🩸 🧘 💆 🏃 🚴 🏋️ ⚽ 🏀 🎾 🏊 🥊 🧠 ❤️‍🩹 🩻')],
  ['Shopping', e('🛍️ 👕 👖 👗 👠 👟 👜 🎒 🧥 🧢 👑 💍 ⌚ 🕶️ 🧣 💄 💅 🧴 🪮 💇 🎁 📦 🏬 🛒 🧸')],
  ['Fun', e('🎮 🕹️ 🎬 🍿 🎧 🎵 🎸 🎹 🎤 🎭 🎨 📚 🎲 🧩 🎯 🎳 🎪 🎡 🎢 🎟️ 🎉 🎊 🎈 📷 🎥 ♟️ 🪁')],
  ['Work & school', e('🎓 📖 ✏️ 📝 🖊️ 📐 🔬 🧪 🏫 💼 🧑‍💻 💻 🖥️ ⌨️ 🖨️ 📱 ☎️ 📡 🗂️ 📊 📅 🧑‍🏫 🏆 🥇')],
  ['Travel', e('🌍 🧳 🏖️ 🏝️ ⛺ 🏔️ 🗺️ 🧭 🏨 🛂 📸 🌅 🕌 ⛪ 🗽 🗼 🎑 🌴 🚏')],
  ['Family & pets', e('👨‍👩‍👧 👶 🍼 🧒 👵 👴 🤝 💝 💐 🐶 🐱 🐾 🐴 🐟 🐦 🐰 🌹 💒 🕊️')],
  ['Nature & misc', e('🌱 🌳 ☀️ 🌧️ ❄️ 🔥 💧 ⚡ ⭐ ✨ 🌈 🛡️ 🔒 🔔 ⏰ ♻️ 📌 🏷️ 🎖️ 🕋 🤲 🧿 ❓')],
];
export const EMOJI_COUNT = EMOJI_GROUPS.reduce((n, g) => n + g[1].length, 0);
