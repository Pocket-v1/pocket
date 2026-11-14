// Free, rule-based "brain" for the chat on top of parseChat.
// parseMessage(text, ctx) -> array of results:
//   {draft}            a card to confirm (expense, income, transfer, goal, debt, bill, fuel, service, budget, newbill)
//   {answer, page?}    a short reply to a question, with an optional page to open
//   {navigate, label}  open a page
//   {error}
import { normalizeDigits } from './smsParser.js';
import { parseChat, extractAmount, readMemory } from './chatParser.js';

const norm = s => normalizeDigits(String(s || '')).toLowerCase()
  .replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ').trim();
const any = (t, words) => words.some(w => new RegExp(`(^|[^a-z0-9\\u0600-\\u06ff]|(?:^|\\s)(?:ال|وال|بال|لل|و|ب|ل|فال))${norm(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9\\u0600-\\u06ff])`).test(t));

const FUEL_W = ['benzin', 'banzin', 'bnzin', 'fuel', 'petrol', 'solar', 'diesel', 'بنزين', 'سولار', 'وقود', 'فول تانك'];
const SERVICE_W = ['zet', 'zeit', 'oil change', 'oil', 'service', 'siyana', 'syana', 'maintenance', 'repair', 'tasle7', 'mechanic', 'mikaniki', 'tires', 'tyres', 'kawetsh', 'fraamel', 'faramel', 'brakes', 'battery', 'batarya', 'زيت', 'صيانه', 'تصليح', 'ميكانيكي', 'كاوتش', 'فرامل', 'بطاريه', 'غيرت', 'سمكره', 'ترخيص'];
const CAR_W = ['3arabeya', 'arabeya', 'car', 'el 3arabeya', 'عربيه', 'العربيه', 'سياره'];
const BUDGET_W = ['budget', 'mizanya', 'mezanya', 'ميزانيه', 'بادجت'];
const MONTHLY_W = ['kol shahr', 'monthly', 'every month', 'kol sh', 'كل شهر', 'شهري', 'شهريا'];
const NEW_BILL_W = ['fatoret', 'fatora', 'bill', 'eshtrak', 'subscription', 'فاتوره', 'اشتراك'];
const Q_W = ['kam', 'how much', 'how many', 'what', 'eh', 'akter', 'most', 'top', 'fadel', 'fadl', 'left', 'remaining', 'ba2y', 'كام', 'قد ايه', 'اكتر', 'فاضل', 'باقي', 'ايه', 'مين', 'هل'];
const NAV_W = /^(efta7|eft7|ft7|open|go to|goto|show|warini|wareny|rou7|ro7|افتح|روح|وريني|ورينى|اعرض)\s+(.+)$/;

// page label -> words that point to it
const PAGE_ALIASES = {
  'Overview': ['overview', 'home', 'raeesya', 'الرئيسيه', 'الهوم'],
  'Transactions': ['transactions', 'mo3amalat', 'المعاملات', 'العمليات', 'مصاريف'],
  'Bank SMS': ['sms', 'bank sms', 'rasayel', 'الرسايل', 'رسائل البنك'],
  'Accounts': ['accounts', 'account', '7esabat', 'الحسابات', 'محفظه'],
  'Insights & reports': ['reports', 'insights', 'ta2arir', 'التقارير', 'تقرير'],
  'Cash flow calendar': ['calendar', 'cash flow', 'نتيجه', 'التقويم', 'الكاليندر'],
  'Budgets': ['budgets', 'budget', 'mizanya', 'الميزانيه', 'الميزانيات'],
  'Savings goals': ['goals', 'goal', 'ahdaf', 'hadaf', 'الاهداف', 'الهدف', 'التحويش'],
  'Subscriptions & bills': ['bills', 'subscriptions', 'fawater', 'الفواتير', 'الاشتراكات'],
  'Debts & installments': ['debts', 'installments', 'loans', 'aqsat', 'الاقساط', 'الديون', 'القروض'],
  'Vehicles': ['vehicles', 'car', 'cars', '3arabeya', 'العربيه', 'العربيات', 'البنزين', 'fuel'],
  'Expense categories': ['categories', 'الفئات', 'التصنيفات'],
};

const CAR_PAGE = p => /vehicle/i.test(p || '');

export const PAGE_EXAMPLES = {
  default: ['صرفت 200 على أكل', 'جالي 3000 مرتب', 'دفعت 95 أوبر', 'حولت 500 من CIB لـ Cash'],
  'Vehicles': ['بنزين 450 30 لتر', 'غيرت زيت 1800 عند 84000', 'صرفت كام على العربية الشهر ده؟'],
  'Budgets': ['ميزانية أكل 4000', 'فاضل كام في الأكل؟', 'budget shopping 1500'],
  'Savings goals': ['حطيت 1000 في السفر', 'حولت 500 من CIB لـ Goals'],
  'Subscriptions & bills': ['فاتورة نت 300 كل شهر', 'دفعت فاتورة الكهربا'],
  'Debts & installments': ['دفعت قسط العربية', 'قسط valU 2000'],
  'Insights & reports': ['صرفت كام الشهر ده؟', 'أكتر حاجة صرفت عليها؟', 'جالي كام الشهر ده؟'],
  'Transactions': ['أكل 200 وتاكسي 80', 'صرفت 350 امبارح أوبر', 'جالي 3000 مرتب'],
};

const fmt = (n, c = 'EGP') => { try { return new Intl.NumberFormat('en-EG', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(Number(n) || 0); } catch { return String(n); } };
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

function period(t, today) {
  const d = new Date(`${today}T12:00:00`);
  if (any(t, ['embare7', 'yesterday', 'امبارح'])) { const y = new Date(d.getTime() - 864e5); return { from: iso(y), to: iso(y), label: 'yesterday' }; }
  if (any(t, ['enharda', 'today', 'النهارده', 'انهارده'])) return { from: today, to: today, label: 'today' };
  if (any(t, ['el esbo3', 'week', 'الاسبوع', 'اسبوع'])) { const s = new Date(d.getTime() - 6 * 864e5); return { from: iso(s), to: today, label: 'the last 7 days' }; }
  if (any(t, ['last month', 'el shahr elly fat', 'الشهر اللي فات', 'الشهر الي فات', 'الشهر الماضي'])) { const s = new Date(d.getFullYear(), d.getMonth() - 1, 1), e = new Date(d.getFullYear(), d.getMonth(), 0); return { from: iso(s), to: iso(e), label: 'last month' }; }
  return { from: iso(new Date(d.getFullYear(), d.getMonth(), 1)), to: today, label: 'this month' };
}

// Which expense category the words point to, if any (skips the "Other" fallback).
function categoryIn(t, cats) {
  const r = parseChat(`صرفت 1 ${t.replace(/[?؟!.,]/g, ' ').replace(/(^|\s)(ال|بال|وال|فال|لل)(?=\S)/g, '$1')}`, { accounts: [{ id: 'x', name: '__' }], expenseCats: cats, memory: readMemory() });
  return r && r.category && r.category !== 'Other' && cats.includes(r.category) ? r.category : '';
}

const isOutflow = (t, goalsId) => t.type === 'Expense' && !(t.goal_id && String(t.account_id) === String(goalsId));

function answerQuestion(t, ctx) {
  const { transactions = [], budgets = [], expenseCats = [], accounts = [], currency, today, vehicleSpend } = ctx;
  const goalsId = accounts.find(a => a.is_system)?.id;
  const p = period(t, today);
  const inP = x => x.transaction_date >= p.from && x.transaction_date <= p.to;
  const cat = categoryIn(t, expenseCats);

  if (any(t, ['fadel', 'fadl', 'left', 'remaining', 'ba2y', 'فاضل', 'باقي'])) {
    const m = today.slice(0, 7);
    const list = budgets.filter(b => String(b.month || '').slice(0, 7) === m && (!cat || b.category === cat));
    if (!list.length) return { answer: cat ? `There is no budget for ${cat} this month. Type: ميزانية ${cat} 3000` : 'You have no budgets this month yet.', page: 'Budgets' };
    const lines = list.map(b => { const spent = transactions.filter(x => isOutflow(x, goalsId) && x.category === b.category && String(x.transaction_date).slice(0, 7) === m).reduce((s, x) => s + Number(x.amount || 0), 0); const left = Number(b.amount) - spent; return `${b.category}: ${left >= 0 ? `${fmt(left, currency)} left` : `${fmt(-left, currency)} over`} of ${fmt(b.amount, currency)}`; });
    return { answer: lines.join('\n'), page: 'Budgets' };
  }
  if (any(t, ['akter', 'most', 'top', 'اكتر', 'اكثر'])) {
    const by = {};
    transactions.filter(x => isOutflow(x, goalsId) && inP(x)).forEach(x => { by[x.category || 'Other'] = (by[x.category || 'Other'] || 0) + Number(x.amount || 0); });
    const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (!top.length) return { answer: `No spending recorded for ${p.label}.` };
    return { answer: `Most spending ${p.label}:\n${top.map(([c, v], i) => `${i + 1}. ${c} · ${fmt(v, currency)}`).join('\n')}`, page: 'Insights & reports' };
  }
  if (any(t, ['ge3ly', 'gali', 'income', 'earned', 'kasabt', 'dakhl', 'جالي', 'دخل', 'كسبت', 'قبضت'])) {
    const v = transactions.filter(x => x.type === 'Income' && inP(x)).reduce((s, x) => s + Number(x.amount || 0), 0);
    return { answer: `Income ${p.label}: ${fmt(v, currency)}`, page: 'Transactions' };
  }
  if (CAR_PAGE(ctx.page) || any(t, CAR_W) || any(t, FUEL_W)) {
    if (vehicleSpend) { const v = vehicleSpend(p.from, p.to); return { answer: `Car costs ${p.label}: ${fmt(v.total, currency)} (fuel ${fmt(v.fuel, currency)}, service ${fmt(v.service, currency)})`, page: 'Vehicles' }; }
  }
  const list = transactions.filter(x => isOutflow(x, goalsId) && inP(x) && (!cat || x.category === cat));
  const v = list.reduce((s, x) => s + Number(x.amount || 0), 0);
  return { answer: `${cat ? `${cat} spending` : 'You spent'} ${p.label}: ${fmt(v, currency)} · ${list.length} transaction${list.length === 1 ? '' : 's'}`, page: 'Transactions' };
}

function findVehicle(t, vehicles) {
  if (!vehicles?.length) return null;
  return vehicles.find(v => [v.name, v.model, v.make].filter(Boolean).some(n => t.includes(norm(n)))) || vehicles[0];
}

function parseFuel(t, raw, ctx) {
  let rest = t;
  const lit = rest.match(/(\d+(?:\.\d+)?)\s*(لتر|litre|liter|ltr|lt|l)(?![a-z])/);
  if (lit) rest = rest.replace(lit[0], ' ');
  const odo = rest.match(/(?:عند|عداد|odo|odometer|at|3and)\s*(\d{3,7})|(\d{4,7})\s*(?:km|كم|كيلو)/);
  if (odo) rest = rest.replace(odo[0], ' ');
  const typ = rest.match(/(?:بنزين|benzin|banzin)\s*(80|92|95|98)(?!\d)/);
  if (typ) rest = rest.replace(typ[1], ' ');
  const amt = extractAmount(rest);
  if (!amt) return null;
  const v = findVehicle(t, ctx.vehicles);
  const fuelType = any(t, ['solar', 'diesel', 'سولار']) ? 'Diesel' : typ ? `${typ[1]} Octane` : (ctx.lastFuelType || '92 Octane');
  return { kind: 'fuel', amount: amt.amount, liters: lit ? Number(lit[1]) : '', odometer: odo ? Number(odo[1] || odo[2]) : '', vehicleId: v?.id || '', fuelType, fullTank: any(t, ['full', 'فول']), rawText: raw };
}

function parseService(t, raw, ctx) {
  let rest = t;
  const odo = rest.match(/(?:عند|عداد|odo|odometer|at|3and)\s*(\d{3,7})|(\d{4,7})\s*(?:km|كم|كيلو)/);
  if (odo) rest = rest.replace(odo[0], ' ');
  const amt = extractAmount(rest);
  if (!amt) return null;
  const v = findVehicle(t, ctx.vehicles);
  let title = raw.replace(/[\d٠-٩.,]+/g, ' ').replace(/(غيرت|عملت|دفعت|صيانه|صيانة|عند|عداد|km|كم|جنيه|egp|le)/gi, ' ').replace(/\s+/g, ' ').trim();
  const type = any(t, ['zet', 'zeit', 'oil', 'زيت']) ? 'Oil change' : any(t, ['tires', 'tyres', 'kawetsh', 'كاوتش']) ? 'Tires' : any(t, ['repair', 'tasle7', 'تصليح', 'سمكره']) ? 'Repair' : 'Routine maintenance';
  if (title.length < 5) title = type === 'Routine maintenance' ? (title || 'Service') : type;
  return { kind: 'service', amount: amt.amount, odometer: odo ? Number(odo[1] || odo[2]) : '', vehicleId: v?.id || '', title: title.charAt(0).toUpperCase() + title.slice(1), serviceType: type, rawText: raw };
}

function navTarget(t, pages) {
  const m = t.match(NAV_W);
  const target = m ? m[2] : t;
  for (const label of pages) {
    const words = [label, ...(PAGE_ALIASES[label] || [])].map(norm);
    if (words.some(w => target.includes(w))) return label;
  }
  return null;
}

const defAcc = ctx => { const u = (ctx.accounts || []).filter(a => !a.is_system && !/^goals$/i.test(a.name || '')); return (u.find(a => String(a.id) === String(ctx.defaultAccountId)) || u.find(a => !/card|credit|installment/i.test(a.type || '')) || u[0])?.id || ''; };

function one(raw, ctx) {
  const t = norm(raw);
  if (!t) return { error: 'empty' };
  const hasNum = /\d/.test(t);
  const pages = ctx.pages || Object.keys(PAGE_ALIASES);

  // Open a page
  if (NAV_W.test(t) && !hasNum) { const p = navTarget(t, pages); if (p) return { navigate: p }; }

  // Questions (no amount, question words or a question mark)
  if ((/[?؟]/.test(raw) || any(t, Q_W)) && !extractAmount(t.replace(/(\d{4})/g, ' '))) return answerQuestion(t, ctx);

  // Budget: "ميزانية أكل 4000"
  if (any(t, BUDGET_W) && hasNum) {
    const amt = extractAmount(t); const cat = categoryIn(t, ctx.expenseCats || []);
    if (amt) return { draft: { kind: 'budget', amount: amt.amount, category: cat || (ctx.expenseCats || [])[0] || 'Other', month: ctx.today.slice(0, 7), rawText: raw } };
  }

  // Vehicles
  const hasCars = (ctx.vehicles || []).length > 0;
  if (hasCars && any(t, FUEL_W)) { const d = parseFuel(t, raw, ctx); if (d) return { draft: { ...d, date: ctx.today, accountId: defAcc(ctx) } }; }
  if (hasCars && (any(t, SERVICE_W) && (any(t, CAR_W) || CAR_PAGE(ctx.page) || any(t, ['zet', 'zeit', 'oil', 'زيت', 'كاوتش', 'فرامل', 'ميكانيكي', 'mechanic', 'brakes', 'tires'])))) { const d = parseService(t, raw, ctx); if (d) return { draft: { ...d, date: ctx.today, accountId: defAcc(ctx) } }; }

  // New recurring bill: "فاتورة نت 300 كل شهر"
  if (any(t, NEW_BILL_W) && any(t, MONTHLY_W) && hasNum) {
    const amt = extractAmount(t);
    if (amt) {
      const name = raw.replace(/[\d٠-٩.,]+/g, ' ').replace(/(فاتورة|فاتوره|اشتراك|كل شهر|شهري|شهريا|bill|subscription|monthly|every month|kol shahr|fatoret|fatora|eshtrak)/gi, ' ').replace(/\s+/g, ' ').trim() || 'Bill';
      const next = new Date(`${ctx.today}T12:00:00`); next.setMonth(next.getMonth() + 1);
      return { draft: { kind: 'newbill', amount: amt.amount, name: name.charAt(0).toUpperCase() + name.slice(1), category: categoryIn(t, ctx.expenseCats || []) || 'Bills & Utilities', nextDue: iso(next), accountId: defAcc(ctx), rawText: raw } };
    }
  }

  // On the Vehicles page a bare amount means fuel
  if (hasCars && CAR_PAGE(ctx.page) && /^\s*[\d.,]+\s*(egp|le|جنيه)?\s*$/.test(t)) { const d = parseFuel(t, raw, ctx); if (d) return { draft: { ...d, date: ctx.today, accountId: defAcc(ctx) } }; }

  const r = parseChat(raw, ctx);
  if (r.error) {
    if (!hasNum) { const p = navTarget(t, pages); if (p) return { navigate: p }; }
    return { error: r.error };
  }
  return { draft: r };
}

// Several things in one message: "أكل 200 وتاكسي 80" / "uber 95, coffee 40"
function split(raw) {
  const parts = raw.split(/\s*(?:\n|،|,|\+|\band\b|\s&\s)\s*|\s+و(?=\S)/i).map(s => s.trim()).filter(Boolean);
  return parts.length > 1 && parts.every(p => /[\d٠-٩]/.test(p)) ? parts : [raw];
}

export function parseMessage(raw, ctx) {
  return split(raw).map(p => one(p, ctx));
}

// Extra hints shown on an expense card.
export function draftNotes(d, ctx) {
  const notes = [];
  if (!d || !(Number(d.amount) > 0)) return notes;
  const { transactions = [], budgets = [], accounts = [], currency } = ctx;
  if (d.kind === 'expense' || d.kind === 'income' || d.kind === 'fuel') {
    const dup = transactions.find(x => x.transaction_date === d.date && Math.abs(Number(x.amount) - Number(d.amount)) < 0.01 && (d.kind === 'income' ? x.type === 'Income' : x.type === 'Expense'));
    if (dup) notes.push({ tone: 'warn', text: `You already have ${fmt(dup.amount, currency)} on this day (${dup.description || dup.category}). Save only if it is a different one.` });
  }
  if (d.kind === 'expense' && d.category) {
    const m = String(d.date || '').slice(0, 7);
    const b = budgets.find(x => x.category === d.category && String(x.month || '').slice(0, 7) === m);
    if (b) {
      const goalsId = accounts.find(a => a.is_system)?.id;
      const spent = transactions.filter(x => isOutflow(x, goalsId) && x.category === d.category && String(x.transaction_date).slice(0, 7) === m).reduce((s, x) => s + Number(x.amount || 0), 0);
      const pct = Math.round((spent + Number(d.amount)) * 100 / Number(b.amount || 1));
      if (pct >= 80) notes.push({ tone: pct > 100 ? 'bad' : 'warn', text: pct > 100 ? `This puts ${d.category} over its budget (${pct}%).` : `This takes ${d.category} to ${pct}% of its budget.` });
    }
  }
  return notes;
}
