// One shared icon system for categories and subcategories. Icons are Phosphor, saved as "ph:IconName".
// Emoji saved by older versions are converted to the nearest Phosphor icon when read.
// Choices are saved in the user's cloud settings (settings.categoryIcons), so they follow the account.
// Keys: "Category" for a category, "Category::Sub" for a subcategory.
let overrides = {};
const EVT = 'pocket-category-icons-updated';
export const setCategoryIconOverrides = obj => { overrides = obj && typeof obj === 'object' ? { ...obj } : {}; try { window.dispatchEvent(new Event(EVT)); } catch { /* ignore */ } };
export const CATEGORY_ICONS_EVENT = EVT;
export const iconKey = (name, parent) => parent ? `${parent}::${name}` : String(name || '');

const RULES = [
  [/housing|home|house|rent|mortgage/, 'ph:House'], [/grocer|supermarket/, 'ph:ShoppingCart'], [/food|dining|restaurant|meal|cafe|coffee/, 'ph:Hamburger'],
  [/transport|taxi|uber|metro|bus/, 'ph:Bus'], [/fuel|petrol|gas station/, 'ph:GasPump'], [/car|vehicle|auto|parking|gear/, 'ph:Car'],
  [/bill|util|electric|water|internet|wifi/, 'ph:Lightbulb'], [/phone|mobile|recharge/, 'ph:DeviceMobile'], [/health|medic|pharm|doctor|clinic|dental/, 'ph:Stethoscope'],
  [/shop|cloth|fashion|style|accessor/, 'ph:ShoppingBag'], [/entertain|fun|leisure|cinema|movie|game/, 'ph:GameController'], [/educ|school|course|learn|book|tuition/, 'ph:GraduationCap'],
  [/travel|trip|holiday|vacation|flight|hotel/, 'ph:Airplane'], [/saving|invest|debt|loan/, 'ph:PiggyBank'], [/family|giving|charity|gift|donat/, 'ph:Gift'],
  [/beauty|skin|makeup/, 'ph:Sparkle'], [/hair|nail|salon/, 'ph:Scissors'], [/period|personal care|groom/, 'ph:Drop'], [/fit|sport|gym/, 'ph:Barbell'],
  [/pet|dog|cat/, 'ph:PawPrint'], [/insur/, 'ph:ShieldCheck'], [/subscr|netflix|spotify/, 'ph:Repeat'], [/tax|fee|fine/, 'ph:Receipt'], [/tech|laptop|electron/, 'ph:Laptop'],
  [/salary|wage|payroll/, 'ph:Briefcase'], [/freelance/, 'ph:Laptop'], [/business/, 'ph:Buildings'], [/bonus/, 'ph:Confetti'], [/invest/, 'ph:ChartLineUp'], [/other income/, 'ph:Money'], [/other/, 'ph:Shapes'],
];

// Emoji chosen in older versions -> nearest Phosphor icon.
const EMOJI_TO_ICON = { '💰': 'Money', '💵': 'Money', '💳': 'CreditCard', '🏦': 'Bank', '💸': 'HandCoins', '🪙': 'Coins', '💎': 'Diamond', '🧾': 'Receipt', '📈': 'ChartLineUp', '📉': 'ChartLineDown', '🏧': 'Bank', '💹': 'ChartLineUp', '🤑': 'Money', '🧮': 'Calculator', '🪪': 'IdentificationCard', '💲': 'CurrencyDollar', '🏷️': 'Tag', '🧧': 'Gift', '💱': 'CurrencyCircleDollar', '🏛️': 'Bank', '🍔': 'Hamburger', '🍕': 'Pizza', '🍟': 'Hamburger', '🌭': 'Hamburger', '🥪': 'Bread', '🌮': 'ForkKnife', '🍗': 'ForkKnife', '🍖': 'ForkKnife', '🥩': 'ForkKnife', '🍣': 'Fish', '🍜': 'BowlSteam', '🍝': 'BowlFood', '🥗': 'BowlFood', '🍳': 'CookingPot', '🥞': 'CookingPot', '🧇': 'CookingPot', '🥐': 'Bread', '🍞': 'Bread', '🧀': 'Cheese', '🥚': 'Egg', '🍎': 'AppleLogo', '🍌': 'OrangeSlice', '🍇': 'Cherries', '🍉': 'OrangeSlice', '🍓': 'Cherries', '🥑': 'Avocado', '🥦': 'Carrot', '🥕': 'Carrot', '🌽': 'Carrot', '🍩': 'Cookie', '🍪': 'Cookie', '🍰': 'Cake', '🎂': 'Cake', '🍫': 'Cookie', '🍿': 'Popcorn', '☕': 'Coffee', '🍵': 'Coffee', '🧋': 'Coffee', '🥤': 'Coffee', '🍺': 'BeerStein', '🍷': 'Wine', '🍹': 'Martini', '🛒': 'ShoppingCart', '🥖': 'Bread', '🍚': 'BowlFood', '🥙': 'ForkKnife', '🏠': 'House', '🏡': 'HouseLine', '🏢': 'Buildings', '🛋️': 'Couch', '🛏️': 'Bed', '🚿': 'Shower', '🛁': 'Bathtub', '🧹': 'Broom', '🧺': 'WashingMachine', '🧼': 'Drop', '🧽': 'Broom', '🔑': 'Key', '🚪': 'Door', '🪑': 'Chair', '💡': 'Lightbulb', '🔌': 'Plug', '🪟': 'House', '🧯': 'FireExtinguisher', '🪴': 'PottedPlant', '🛠️': 'Wrench', '🔧': 'Wrench', '🔨': 'Hammer', '🧰': 'Toolbox', '🪜': 'Steps', '📺': 'Television', '🧊': 'Snowflake', '🍽️': 'ForkKnife', '🪞': 'Sparkle', '🚗': 'Car', '🚕': 'Taxi', '🚙': 'Jeep', '🚌': 'Bus', '🚎': 'Bus', '🚓': 'Car', '🚑': 'FirstAid', '🚒': 'FireExtinguisher', '🚚': 'Truck', '🏍️': 'Motorcycle', '🛵': 'Scooter', '🚲': 'Bicycle', '🛴': 'Scooter', '🚆': 'Train', '🚇': 'TrainSimple', '🚊': 'Tram', '✈️': 'Airplane', '🛫': 'AirplaneTakeoff', '🚁': 'Airplane', '🚢': 'Boat', '⛵': 'Boat', '⛽': 'GasPump', '🅿️': 'Car', '🛞': 'Tire', '🚦': 'TrafficSignal', '🛣️': 'RoadHorizon', '🚀': 'Rocket', '🛺': 'Taxi', '🩺': 'Stethoscope', '💊': 'Pill', '💉': 'Syringe', '🩹': 'Bandaids', '🏥': 'Hospital', '🦷': 'Tooth', '👓': 'Eyeglasses', '🧬': 'Dna', '🩸': 'Drop', '🧘': 'FlowerLotus', '💆': 'Sparkle', '🏃': 'PersonSimpleRun', '🚴': 'PersonSimpleBike', '🏋️': 'Barbell', '⚽': 'SoccerBall', '🏀': 'Basketball', '🎾': 'TennisBall', '🏊': 'PersonSimpleSwim', '🥊': 'BoxingGlove', '🧠': 'Brain', '❤️‍🩹': 'Heartbeat', '🩻': 'FirstAidKit', '🛍️': 'ShoppingBag', '👕': 'TShirt', '👖': 'Pants', '👗': 'Dress', '👠': 'HighHeel', '👟': 'Sneaker', '👜': 'Handbag', '🎒': 'Backpack', '🧥': 'Hoodie', '🧢': 'BaseballCap', '👑': 'Crown', '💍': 'Diamond', '⌚': 'Watch', '🕶️': 'Sunglasses', '🧣': 'Hoodie', '💄': 'Sparkle', '💅': 'Sparkle', '🧴': 'Drop', '🪮': 'HairDryer', '💇': 'Scissors', '🎁': 'Gift', '📦': 'Package', '🏬': 'Storefront', '🧸': 'Gift', '🎮': 'GameController', '🕹️': 'Joystick', '🎬': 'FilmSlate', '🎧': 'Headphones', '🎵': 'MusicNotes', '🎸': 'Guitar', '🎹': 'PianoKeys', '🎤': 'Microphone', '🎭': 'MaskHappy', '🎨': 'Palette', '📚': 'Books', '🎲': 'DiceFive', '🧩': 'PuzzlePiece', '🎯': 'Trophy', '🎳': 'Trophy', '🎪': 'Ticket', '🎡': 'Ticket', '🎢': 'Ticket', '🎟️': 'Ticket', '🎉': 'Confetti', '🎊': 'Confetti', '🎈': 'Balloon', '📷': 'Camera', '🎥': 'VideoCamera', '♟️': 'PuzzlePiece', '🪁': 'Balloon', '🎓': 'GraduationCap', '📖': 'BookOpen', '✏️': 'Pencil', '📝': 'Pencil', '🖊️': 'Pen', '📐': 'Ruler', '🔬': 'Flask', '🧪': 'TestTube', '🏫': 'Chalkboard', '💼': 'Briefcase', '🧑‍💻': 'Laptop', '💻': 'Laptop', '🖥️': 'Desktop', '⌨️': 'Keyboard', '🖨️': 'Printer', '📱': 'DeviceMobile', '☎️': 'Phone', '📡': 'Broadcast', '🗂️': 'Folder', '📊': 'ChartBar', '📅': 'Calendar', '🧑‍🏫': 'Chalkboard', '🏆': 'Trophy', '🥇': 'Medal', '🌍': 'Globe', '🧳': 'Suitcase', '🏖️': 'Umbrella', '🏝️': 'Island', '⛺': 'Tent', '🏔️': 'Mountains', '🗺️': 'MapTrifold', '🧭': 'Compass', '🏨': 'Bed', '🛂': 'IdentificationCard', '📸': 'Camera', '🌅': 'Sun', '🕌': 'Mosque', '⛪': 'Church', '🗽': 'MapPin', '🗼': 'MapPin', '🎑': 'Mountains', '🌴': 'TreePalm', '🚏': 'Signpost', '👨‍👩‍👧': 'UsersThree', '👶': 'Baby', '🍼': 'Baby', '🧒': 'Users', '👵': 'Users', '👴': 'Users', '🤝': 'Handshake', '💝': 'HandHeart', '💐': 'Flower', '🐶': 'Dog', '🐱': 'Cat', '🐾': 'PawPrint', '🐴': 'Horse', '🐟': 'Fish', '🐦': 'Bird', '🐰': 'Rabbit', '🌹': 'Flower', '💒': 'Church', '🕊️': 'Bird', '🌱': 'Plant', '🌳': 'Tree', '☀️': 'Sun', '🌧️': 'CloudRain', '❄️': 'Snowflake', '🔥': 'Fire', '💧': 'Drop', '⚡': 'Lightning', '⭐': 'Star', '✨': 'Sparkle', '🌈': 'Rainbow', '🛡️': 'ShieldCheck', '🔒': 'Lock', '🔔': 'Bell', '⏰': 'Alarm', '♻️': 'Recycle', '📌': 'PushPin', '🎖️': 'Medal', '🕋': 'Mosque', '🤲': 'HandsPraying', '🧿': 'Shield', '❓': 'Question', '🔁': 'Repeat' };
const stripVs = v => String(v || '').replace(/\uFE0F/g, '');
const EMOJI_LOOKUP = Object.fromEntries(Object.entries(EMOJI_TO_ICON).map(([k, v]) => [stripVs(k), v]));
// Any saved value -> "ph:IconName", or '' when it is empty or an emoji with no match.
export function toIcon(value) {
  const v = String(value || '').trim(); if (!v) return '';
  if (v.startsWith('ph:')) return v;
  const hit = EMOJI_LOOKUP[stripVs(v)];
  return hit ? `ph:${hit}` : '';
}
export function defaultIcon(name, parent) {
  const n = String(name || '').toLowerCase();
  const hit = RULES.find(([r]) => r.test(n));
  if (hit) return hit[1];
  if (parent) return defaultIcon(parent);
  return 'ph:Tag';
}
export function getCategoryIcon(name, parent) {
  return toIcon(overrides[iconKey(name, parent)]) || (parent && overrides[parent] && !RULES.some(([r]) => r.test(String(name).toLowerCase())) ? toIcon(overrides[parent]) : '') || defaultIcon(name, parent);
}
export const hasCustomIcon = (name, parent) => Boolean(overrides[iconKey(name, parent)]);

export async function saveCategoryIcon(supabase, uid, key, emoji) {
  const next = { ...overrides };
  const icon = toIcon(emoji);
  if (icon) next[key] = icon; else delete next[key];
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
