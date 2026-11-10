// Free, rule-based parser for the "Add by typing" chat. No AI, no network.
// parseChat(text, ctx) -> draft object the confirm card can edit, or {error}.
import { normalizeDigits } from './smsParser.js';

const norm = s => normalizeDigits(String(s || '')).toLowerCase()
  .replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ').trim();

const has = (t, words) => words.some(w => new RegExp(`(^|[^a-z0-9\\u0600-\\u06ff])${w}($|[^a-z0-9\\u0600-\\u06ff])`).test(t));

const INCOME_W = ['ge3ly','gali','gaaly','galy','gany','estalamt','istalamt','esta2balt','2bdt','2abadt','ba2ouly','salary','mortab','received','got paid','earned','income','deposit','bonus','قبضت','استلمت','جالي','جاني','مرتب','ايراد','دخل'];
const TRANSFER_W = ['7awalt','hawalt','7awelt','7awel','hawel','transfer','transferred','moved','حولت','تحويل','حول'];
const GOAL_W = ['7ottet','7otet','hottet','7ot','hot','7at','save','saved','add to goal','ادخرت','حطيت','وفرت'];
const DEBT_W = ['qest','qesta','2est','2esta','installment','salfa','loan','debt','قسط','سلفه','قرض'];
const BILL_W = ['fatoret','fatora','bill','فاتوره','اشتراك'];
const PAY_W = ['dafa3t','dafa3','dafaat','7asalt','paid','pay','دفعت','سددت','sadadt','sadd'];
const SPEND_W = ['sarraft','saraft','sarafet','srft','spent','bought','eshtareet','eshtarit','eshtaret','اشتريت','صرفت'];
const YESTERDAY_W = ['embare7','embar7','imbare7','ambare7','yesterday','امبارح','مبارح'];

// keyword -> expense category (names match src/lib/categories.js)
const CAT_KEYS = [
  ['Food & Groceries', ['akl','2akl','makl','food','eat','lunch','dinner','breakfast','ghada','3asha','fatar','futoor','restaurant','resto','cafe','coffee','qahwa','ahwa','talabat','elmenus','mcdonalds','kfc','pizza','burger','supermarket','carrefour','spinneys','hyper','groceries','khodar','fakha','lahma','اكل','طعام','غدا','عشا','فطار','قهوه','مطعم','سوبر ماركت']],
  ['Transportation', ['uber','careem','indrive','taxi','metro','bus','microbus','mikrobas','fuel','benzin','banzin','gas','petrol','parking','garage','toll','transport','موصلات','بنزين','تاكسي','مترو','اوبر']],
  ['Bills & Utilities', ['kahraba','electricity','mayah','water','gas bill','internet','wifi','vodafone','orange','etisalat','we','mobile','mobail','ra4eed','recharge','kart','phone bill','كهرباء','مياه','نت','انترنت','رصيد']],
  ['Housing', ['rent','igar','ejar','eigar','maintenance','siyana','سكن','ايجار','صيانه']],
  ['Health', ['doctor','dr','dokTor','pharmacy','saydaleya','dawa','medicine','hospital','clinic','analysis','تحاليل','دكتور','صيدليه','دوا','علاج']],
  ['Shopping', ['shopping','clothes','hodoom','hedoom','shoes','gazma','amazon','noon','jumia','mall','tshirt','pantalon','ملابس','هدوم','حذاء']],
  ['Entertainment', ['cinema','sinema','movie','netflix','spotify','shahid','game','games','playstation','psn','outing','kharga','خروجه','سينما']],
  ['Education', ['course','school','madrasa','university','gam3a','books','book','kotob','tuition','udemy','مدرسه','جامعه','كورس','كتب']],
  ['Travel', ['flight','hotel','travel','safar','trip','ticket','tazkara','سفر','فندق','طيران']],
  ['Family & Giving', ['sadaqa','sadaka','zakat','zakah','gift','hedeya','hadiya','charity','family','أهل','صدقه','زكاه','هديه']]
];

const INCOME_CATS = [
  ['Salary', ['salary','mortab','مرتب','راتب']],
  ['Freelance', ['freelance','project','gig','shoghl','مشروع']],
  ['Bonus', ['bonus','hafez','حافز','مكافاه']],
  ['Investments', ['dividend','investment','profit','arbah','ارباح']],
  ['Business', ['business','sales','mabee3at','مبيعات']]
];

const MEM_KEY = 'pocket-chat-category-memory';
export function readMemory() { try { return JSON.parse(localStorage.getItem(MEM_KEY) || '{}') || {}; } catch { return {}; } }
export function rememberCategory(description, category, type) {
  try {
    const w = norm(description).split(' ').filter(x => x.length > 2 && !/^\d/.test(x))[0];
    if (!w || !category) return;
    const m = readMemory(); m[`${type}:${w}`] = category; localStorage.setItem(MEM_KEY, JSON.stringify(m));
  } catch { /* storage may be blocked */ }
}

export function extractAmount(t) {
  let s = t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2').replace(/(\d)٬(\d{3})/g, '$1$2');
  const m = s.match(/(?<![a-z0-9.])(\d+(?:\.\d+)?)\s*(k|alf|الف|آلاف)?(?![a-z0-9])/);
  if (m) {
    let n = Number(m[1]);
    if (m[2]) n *= 1000;
    return { amount: n, raw: m[0] };
  }
  const w = s.match(/(^|\s)(alf|الف)(\s|$)/);
  if (w) return { amount: 1000, raw: w[2] };
  return null;
}

function bestMatch(t, items, nameOf) {
  let best = null;
  for (const it of items) {
    const n = norm(nameOf(it));
    if (!n || n.length < 2) continue;
    const tokens = n.split(/[^a-z0-9؀-ۿ]+/).filter(x => x.length > 1);
    const whole = t.includes(n);
    const hit = tokens.length && tokens.every(x => t.includes(x));
    const part = tokens.some(x => x.length > 3 && new RegExp(`(^|[^a-z0-9])${x}`).test(t));
    const score = whole ? 3 + n.length / 100 : hit ? 2 : part ? 1 : 0;
    if (score && (!best || score > best.score)) best = { item: it, score, name: n };
  }
  return best;
}

function findAccounts(t, accounts) {
  const found = [];
  for (const a of accounts) {
    const n = norm(a.name);
    if (!n) continue;
    const tokens = n.split(/[^a-z0-9؀-ۿ]+/).filter(x => x.length > 1);
    let idx = t.indexOf(n);
    if (idx < 0 && tokens.length) {
      const first = tokens.find(x => x.length > 2 && new RegExp(`(^|[^a-z0-9])${x}($|[^a-z0-9])`).test(t));
      if (first) idx = t.search(new RegExp(`(^|[^a-z0-9])${first}`));
    }
    if (idx >= 0) found.push({ a, idx, len: n.length });
  }
  return found.sort((x, y) => x.idx - y.idx);
}

function pickCategory(t, type, categoriesList, memory) {
  const words = t.split(/[^a-z0-9؀-ۿ]+/).filter(Boolean);
  for (const w of words) { const m = memory[`${type}:${w}`]; if (m) return m; }
  const table = type === 'Income' ? INCOME_CATS : CAT_KEYS;
  for (const [cat, keys] of table) {
    if (!categoriesList.includes(cat)) continue;
    if (keys.some(k => { const kk = norm(k); return kk.length > 2 ? words.includes(kk) || (kk.length > 4 && t.includes(kk)) : words.includes(kk); })) return cat;
  }
  return type === 'Income' ? (categoriesList.includes('Other income') ? 'Other income' : categoriesList[0]) : (categoriesList.includes('Other') ? 'Other' : categoriesList[0]);
}

const STOP = new RegExp(`(^|\\s)(${[...INCOME_W, ...TRANSFER_W, ...GOAL_W, ...DEBT_W, ...BILL_W, ...PAY_W, ...SPEND_W, ...YESTERDAY_W, '3ala','3la','ala','fi','fe','f','mn','men','min','from','to','l','le','lel','ela','ila','bel','bi','b','el','al','on','for','at','today','enharda','elnaharda','النهارده','امبارح','علي','على','في','من','الي','الى','ل']
  .map(w => norm(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=\\s|$)`, 'g');

export function parseChat(text, ctx = {}) {
  const {
    accounts = [], debts = [], recurring = [], goals = [], expenseCats = [], incomeCats = [], today = new Date().toISOString().slice(0, 10), defaultAccountId = '', memory = readMemory()
  } = ctx;
  const t = norm(text);
  if (!t) return { error: 'empty' };
  const amt = extractAmount(t);
  const usable = accounts.filter(a => !a.is_system && !/goal/i.test(a.name) );
  const goalsAcc = accounts.find(a => a.is_system === true || (String(a.name || '').trim().toLowerCase() === 'goals' && String(a.type || '').toLowerCase().includes('saving')));
  const isTransfer = has(t, TRANSFER_W.map(norm));
  const isIncome = has(t, INCOME_W.map(norm));
  const isGoal = has(t, GOAL_W.map(norm)) || /hadaf|goal|هدف/.test(t);
  const isPay = has(t, PAY_W.map(norm));
  const debtM = bestMatch(t, debts.filter(d => Number(d.remaining_amount) > 0), d => d.name);
  const billM = bestMatch(t, recurring.filter(r => r.is_active !== false), r => r.name || r.title);
  const goalM = bestMatch(t, goals, g => g.name);
  const date = has(t, YESTERDAY_W.map(norm)) ? new Date(new Date(`${today}T12:00:00`).getTime() - 864e5).toISOString().slice(0, 10) : today;
  const found = findAccounts(t, usable);
  const defAcc = usable.find(a => String(a.id) === String(defaultAccountId)) || usable.find(a => !/card|credit/i.test(a.type || '')) || usable[0];
  const base = { date, rawText: text };

  // Debt installment: "dafa3t qest l 3arabeya" / "qest 3arabeya 1000"
  if (debtM && (isPay || has(t, DEBT_W.map(norm))) && !isIncome) {
    const d = debtM.item;
    return { ...base, kind: 'debt', debtId: d.id, debtName: d.name, amount: amt?.amount ?? Math.min(Number(d.monthly_payment || 0), Number(d.remaining_amount || 0)), accountId: (found[0]?.a || defAcc)?.id || '' };
  }
  // Bill: "dafa3t fatoret l kahraba"
  if (billM && (isPay || has(t, BILL_W.map(norm))) && !isIncome) {
    const r = billM.item;
    const left = Math.max(0, Number(r.amount || 0) - Number(r.paid_amount || 0));
    return { ...base, kind: 'bill', billId: r.id, billName: r.name || r.title, amount: amt?.amount ?? left, accountId: (found[0]?.a || (usable.find(a => String(a.id) === String(r.account_id))) || defAcc)?.id || '' };
  }
  if (!amt) return { error: 'amount' };

  // Goal deposit: "7ottet 300 fl hadaf bta3 l safar"
  if (isGoal && goalsAcc) {
    const g = goalM?.item || (goals.length === 1 ? goals[0] : null);
    return { ...base, kind: 'goal', amount: amt.amount, goalId: g?.id || '', goalName: g?.name || '', accountId: (found[0]?.a || defAcc)?.id || '', goalsAccountId: goalsAcc.id };
  }
  // Transfer between accounts
  if (isTransfer || (found.length >= 2 && !isIncome && !isPay && /\b(mn|from|men|min)\b|من/.test(t))) {
    let from = found[0]?.a, to = found[1]?.a;
    const fi = t.search(/\b(mn|men|min|from)\b|من/), ti = t.search(/\b(l|le|lel|ela|ila|to)\b|(^|\s)(الي|الى|ل)/);
    if (found.length >= 2 && fi >= 0 && ti >= 0 && ti < fi) { [from, to] = [to, from]; }
    return { ...base, kind: 'transfer', amount: amt.amount, accountId: from?.id || defAcc?.id || '', toAccountId: to?.id || '', description: 'Transfer' };
  }

  const type = isIncome ? 'Income' : 'Expense';
  const cats = type === 'Income' ? incomeCats : expenseCats;
  const category = pickCategory(t, type, cats, memory);
  let desc = t.replace(amt.raw, ' ');
  for (const f of found) desc = desc.replace(norm(f.a.name), ' ');
  desc = desc.replace(STOP, ' ').replace(/\s+/g, ' ').trim();
  desc = desc.replace(/(^|\s)(k|alf)(\s|$)/g, ' ').trim();
  const description = desc ? desc.charAt(0).toUpperCase() + desc.slice(1) : category;
  return { ...base, kind: type.toLowerCase(), type, amount: amt.amount, category, description, accountId: (found[0]?.a || defAcc)?.id || '' };
}

export const EXAMPLES = ['صرفت 200 على أكل', 'جالي 3000 مرتب', 'دفعت 95 أوبر', 'حولت 500 من CIB لـ Cash'];
