// Free receipt reading on the device: tesseract.js (loaded only when a photo is chosen).
import { normalizeDigits } from './smsParser.js';

// Shrink big phone photos first: faster and more accurate.
async function prepare(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    const g = c.getContext('2d'); g.filter = 'grayscale(1) contrast(1.35)'; g.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
    return { image: c, blob: blob || file };
  } catch { return { image: file, blob: file }; }
}

const TOTAL_W = /(grand\s*total|total\s*due|amount\s*due|net\s*total|total|net|to\s*pay|balance\s*due|الاجمالي|الإجمالي|اجمالي|إجمالي|المجموع|الصافي|المطلوب|الاجمالى)/i;
const SKIP_W = /(sub\s*total|subtotal|vat|tax|ضريبه|ضريبة|discount|خصم|change|الباقي|cash|tendered|qty|كميه)/i;
const NUM = /(\d{1,3}(?:[,\s]\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g;

export function parseReceiptText(text) {
  const lines = normalizeDigits(String(text || '')).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const nums = l => [...l.matchAll(NUM)].map(m => Number(m[1].replace(/[,\s]/g, ''))).filter(n => n > 0 && n < 1e7);
  let amount = null;
  // 1) the last "total" line that is not subtotal/VAT
  for (let i = lines.length - 1; i >= 0 && amount == null; i--) {
    if (TOTAL_W.test(lines[i]) && !SKIP_W.test(lines[i])) {
      const own = nums(lines[i]); const n = (own.length ? own : (i + 1 < lines.length ? nums(lines[i + 1]) : [])).filter(x => !(Number.isInteger(x) && x > 1900 && x < 2100));
      if (n.length) amount = Math.max(...n);
    }
  }
  // 2) otherwise the biggest money-looking number
  if (amount == null) {
    const all = lines.filter(l => !/(tel|phone|هاتف|ت:|vat no|tax id|رقم|#)/i.test(l)).flatMap(nums).filter(x => x < 200000 && !(Number.isInteger(x) && x > 1900 && x < 2100));
    const decimals = all.filter(x => !Number.isInteger(x));
    if (decimals.length) amount = Math.max(...decimals); else if (all.length) amount = Math.max(...all);
  }
  // sanity check against subtotal + VAT, or cash − change (OCR sometimes adds a digit)
  if (amount != null) {
    const pick = re => { for (const l of lines) if (re.test(l)) { const n = nums(l).filter(x => !(x > 0 && x <= 100 && /%/.test(l) && l.indexOf(String(x)) < l.indexOf('%'))); if (n.length) return n[n.length - 1]; } return null; };
    const sub = pick(/sub\s*total|subtotal|المجموع الفرعي/i), vat = pick(/vat|tax|ضريبه|ضريبة/i), cash = pick(/^(cash|نقدي|كاش)/i), change = pick(/change|الباقي/i);
    const expected = sub != null ? Number((sub + (vat || 0)).toFixed(2)) : (cash != null && change != null ? Number((cash - change).toFixed(2)) : null);
    if (expected && expected > 0 && Math.abs(amount - expected) > Math.max(1, expected * 0.02) && (amount > expected * 1.5 || amount < expected * 0.5)) amount = expected;
  }
  // shop name: first line with real letters and few digits
  const merchant = (lines.find(l => /[a-z؀-ۿ]{3,}/i.test(l) && (l.match(/\d/g) || []).length < 4 && !/(receipt|invoice|فاتوره|فاتورة|welcome|اهلا|tax|vat)/i.test(l)) || '').replace(/[^\p{L}\p{N}&' .-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  // date
  let date = '';
  const dm = lines.join(' ').match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})|(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dm) {
    const [y, m, d] = dm[1] ? [dm[1], dm[2], dm[3]] : [dm[6].length === 2 ? `20${dm[6]}` : dm[6], dm[5], dm[4]];
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const t = new Date(`${iso}T12:00:00`);
    if (!Number.isNaN(t.getTime()) && t <= new Date(Date.now() + 864e5) && t > new Date(Date.now() - 400 * 864e5)) date = iso;
  }
  return { amount, merchant, date, lines };
}

let workerP = null;
async function worker(onProgress) {
  if (!workerP) {
    workerP = (async () => {
      const { createWorker } = await import('tesseract.js');
      return createWorker(['eng', 'ara'], 1, { logger: m => { if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100)); } });
    })().catch(e => { workerP = null; throw e; });
  }
  return workerP;
}

export async function readReceipt(file, onProgress) {
  const { image, blob } = await prepare(file);
  const w = await worker(onProgress);
  const { data } = await w.recognize(image);
  return { ...parseReceiptText(data.text || ''), blob };
}
