// Bank SMS parser. Keep in sync with supabase/functions/sms-ingest/index.ts
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const normalizeDigits = s => String(s || '').replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d)).replace(/٫/g, '.').replace(/٬/g, ',');

const DEBIT = ['purchase', 'purchased', 'spent', 'debited', 'debit', 'withdrawn', 'withdrawal', 'paid', 'payment', 'pos ', 'transferred to', 'sent', 'charged', 'سحب', 'خصم', 'مشتريات', 'شراء', 'تم دفع', 'دفع', 'تحويل صادر', 'تم تحويل', 'تنفيذ تحويل', 'تم تنفيذ', 'من حسابكم', 'تم سداد', 'سداد'];
const CREDIT = ['credited', 'credit ', 'deposit', 'deposited', 'received', 'refund', 'salary', 'transferred from', 'incoming', 'اضافة', 'إضافة', 'ايداع', 'إيداع', 'استلام', 'تم استلام', 'تحويل وارد', 'راتب', 'استرداد', 'استقبال', 'تم استقبال', 'الى حسابكم'];
const NOISE_BEFORE = /(balance|available|avail|limit|bal|رصيد|الرصيد|المتاح|حد)[^0-9]{0,18}$/i;
const CUR = '(?:EGP|LE|L\\.E\\.?|E£|£E|£|جنيه|ج\\.م|جم|USD|US\\$|\\$|EUR|€|SAR|AED)';

const lc = s => String(s || '').toLowerCase();
const clean = a => Number(String(a).replace(/,/g, ''));

function findAmount(text, custom) {
  if (custom) {
    try { const m = new RegExp(custom, 'i').exec(text); if (m) { const v = clean(m[1] || m[0]); if (v > 0) return v; } } catch { /* ignore bad pattern */ }
  }
  const re = new RegExp(`(?:${CUR}\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?))|(?:([0-9][0-9,]*(?:\\.[0-9]{1,2})?)\\s*${CUR})`, 'gi');
  let m; const found = [];
  while ((m = re.exec(text))) {
    const before = text.slice(Math.max(0, m.index - 28), m.index);
    if (NOISE_BEFORE.test(before)) continue;
    const v = clean(m[1] || m[2]);
    if (v > 0) found.push(v);
  }
  return found[0] || null;
}

const arNorm = s => String(s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[\u064B-\u0652]/g, '');
function earliest(text, list) {
  const t = arNorm(text); let best = null;
  for (const k of list) { const w = arNorm(k).trim(); if (!w) continue; const i = t.indexOf(w); if (i >= 0 && (!best || i < best.i)) best = { i, k }; }
  return best;
}

function findType(text, cfg = {}) {
  const d = earliest(text, [...(cfg.debit_keywords || []), ...DEBIT]);
  const c = earliest(text, [...(cfg.credit_keywords || []), ...CREDIT]);
  const dCustom = (cfg.debit_keywords || []).length && d && (cfg.debit_keywords || []).some(k => lc(k).trim() === lc(d.k).trim());
  const cCustom = (cfg.credit_keywords || []).length && c && (cfg.credit_keywords || []).some(k => lc(k).trim() === lc(c.k).trim());
  if (dCustom && !cCustom) return 'Expense';
  if (cCustom && !dCustom) return 'Income';
  if (d && c) return d.i <= c.i ? 'Expense' : 'Income';
  if (d) return 'Expense';
  if (c) return 'Income';
  return null;
}

function findMerchant(text) {
  const STOP = '(?!(?:حساب|الحساب|بمبلغ|رقم|بطاقة)|(?:card|account|acct)\\b)';
  const re = new RegExp(`(?:\\bat|\\bfrom|\\bto|@|لدى|من|إلى|الى|عند)\\s+${STOP}([A-Za-z0-9\u0600-\u06FF&'._\\- ]{2,34}?)(?=\\s*(?:on|with|using|card|ending|bal|available|avail|\\.|,|;|\\n|$|\\sفي\\s|بتاريخ|رصيد|بطاقة))`, 'i');
  const m = re.exec(text);
  return m ? m[1].trim() : '';
}

export function findLast4(text) {
  const m = /(?:card|acct|account|a\/c|ending|ending in|xx+|\*+|بطاقة|حساب|رقم)\D{0,12}(\d{4})\b/i.exec(text);
  return m ? m[1] : '';
}

export function parseSms(raw, cfg = {}) {
  const text = normalizeDigits(raw).replace(/\s+/g, ' ').trim();
  return { amount: findAmount(text, cfg.amount_pattern), type: findType(text, cfg), merchant: findMerchant(text) || (/تحويل|transfer/i.test(text) ? 'Transfer' : ''), last4: findLast4(text) };
}

// Ignore case, spaces, dashes and symbols so "BacK-AlAhly" and "BanKAlAhly"-style spellings still compare fairly.
const nz = v => lc(v).replace(/[^a-z0-9\u0600-\u06FF]/g, '');
export function matchAccount(configs, sender, last4) {
  const s = nz(sender); let best = null, score = 0;
  for (const c of configs) {
    if (c.enabled === false) continue;
    let sc = 0;
    if (s && (c.senders || []).some(x => nz(x) && (s === nz(x) || s.includes(nz(x)) || nz(x).includes(s)))) sc += 2;
    if (last4 && (c.card_last4 || []).some(x => String(x).trim() === last4)) sc += 3;
    if (sc > score) { score = sc; best = c; }
  }
  return best;
}

// Balance printed in the SMS ("Available balance EGP 8,200.50"), or null.
export function findBalance(raw) {
  const text = normalizeDigits(raw).replace(/\s+/g, ' ');
  const m = new RegExp(`(?:available\\s*balance|avail\\.?\\s*bal(?:ance)?|current\\s*balance|balance|bal|الرصيد\\s*(?:المتاح|الحالي)?|رصيد(?:ك|ك الحالي)?)[^0-9]{0,22}(?:EGP|LE|L\\.E\\.?|E£|£E|£|جنيه|ج\\.م|جم)?\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)`, 'i').exec(text);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Build an amount regex from a sample SMS and the amount the user sees in it.
export function buildAmountPattern(sample, amountText) {
  const text = normalizeDigits(sample); const a = normalizeDigits(amountText).trim();
  if (!a) return null;
  const num = a.replace(/,/g, '');
  const re = new RegExp(`${num.split('').map(c => (c === '.' ? '\\.' : `,?${c}`)).join('').replace(/^,\?/, '')}`);
  const m = re.exec(text); if (!m) return null;
  const before = text.slice(Math.max(0, m.index - 14), m.index).replace(/\s+$/, '').replace(/^\s+/, '');
  const prefix = before.length ? esc(before).replace(/\s+/g, '\\s*') : '';
  return `${prefix}\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)`;
}

// Foreign currency printed in the SMS ("USD", "$", "EUR"…), or null for Egyptian pounds / unknown.
export function detectCurrency(raw) {
  const t = normalizeDigits(raw);
  if (/(?:USD|US\$|\$)\s*[0-9]|[0-9]\s*(?:USD|\$)/i.test(t)) return 'USD';
  if (/(?:EUR|€)\s*[0-9]|[0-9]\s*(?:EUR|€)/i.test(t)) return 'EUR';
  if (/SAR\s*[0-9]|[0-9]\s*SAR/i.test(t)) return 'SAR';
  if (/AED\s*[0-9]|[0-9]\s*AED/i.test(t)) return 'AED';
  return null;
}
