// @ts-nocheck
// Receives forwarded bank SMS from the user's phone (iPhone Shortcuts / Android SMS forwarder),
// parses it and stores it as a PENDING item in sms_inbox. The user approves it inside the app.
// Deploy with JWT verification OFF (the phone has no login session; a per-user secret token is used).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sms-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const normalizeDigits = s => String(s || '').replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d)).replace(/٫/g, '.').replace(/٬/g, ',');

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

function findLast4(text) {
  const m = /(?:card|acct|account|a\/c|ending|ending in|xx+|\*+|بطاقة|حساب|رقم)\D{0,12}(\d{4})\b/i.exec(text);
  return m ? m[1] : '';
}

function parseSms(raw, cfg = {}) {
  const text = normalizeDigits(raw).replace(/\s+/g, ' ').trim();
  return { amount: findAmount(text, cfg.amount_pattern), type: findType(text, cfg), merchant: findMerchant(text) || (/تحويل|transfer/i.test(text) ? 'Transfer' : ''), last4: findLast4(text) };
}

// Ignore case, spaces, dashes and symbols so "BacK-AlAhly" and "BanKAlAhly" still match.
const nz = v => lc(v).replace(/[^a-z0-9\u0600-\u06FF]/g, '');
function matchAccount(configs, sender, last4) {
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

async function sha(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'GET') return json({ ok: false, error: 'Method not allowed' }, 405);

  const url = new URL(req.url);
  let p = {};
  if (req.method === 'POST') {
    const ct = req.headers.get('content-type') || '';
    try {
      if (ct.includes('application/json')) p = await req.json();
      else if (ct.includes('form')) { const f = await req.formData(); f.forEach((v, k) => { p[k] = String(v); }); }
      else { const t = await req.text(); try { p = JSON.parse(t); } catch { p = { body: t }; } }
    } catch { p = {}; }
  }
  for (const [k, v] of url.searchParams) if (p[k] == null) p[k] = v;

  const token = String(req.headers.get('x-sms-token') || p.token || '').trim();
  const sender = String(p.sender ?? p.from ?? p.address ?? p.number ?? '').trim();
  const body = String(p.body ?? p.text ?? p.message ?? p.content ?? p.sms ?? '').trim();
  const when = p.date || p.received_at || p.time;
  if (!token || token.length < 20) return json({ ok: false, error: 'Missing token' }, 401);
  if (!body) return json({ ok: false, error: 'Missing SMS body' }, 400);
  if (body.length > 2000) return json({ ok: false, error: 'SMS too long' }, 413);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Server configuration incomplete' }, 503);
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let userId = null, deviceId = null;
  const { data: tk } = await service.from('sms_tokens').select('user_id').eq('token', token).maybeSingle();
  if (tk) { userId = tk.user_id; await service.from('sms_tokens').update({ last_seen_at: new Date().toISOString() }).eq('token', token); }
  else {
    const { data: dv } = await service.from('sms_devices').select('id,user_id').eq('token', token).eq('revoked', false).maybeSingle();
    if (dv) { userId = dv.user_id; deviceId = dv.id; }
  }
  if (!userId) return json({ ok: false, error: 'Invalid token' }, 401);
  if (deviceId) await service.from('sms_devices').update({ last_seen_at: new Date().toISOString() }).eq('id', deviceId);

  const { data: allowed } = await service.rpc('check_rate_limit', { p_key: `sms:${userId}`, p_max: 200, p_window_seconds: 600 });
  if (allowed === false) return json({ ok: false, error: 'Too many messages. Try again soon.' }, 429);

  const hash = await sha(`${sender}|${body}`);
  let received = new Date();
  const hasDate = !!when && !isNaN(new Date(when).getTime());
  if (hasDate) received = new Date(when);
  // Live SMS: ignore the same text within 10 minutes. Catch-up SMS carry their own timestamp, so the same
  // text received within 15 minutes of that time (a live copy stored on arrival) is ignored however old it is.
  let dupQuery = service.from('sms_inbox').select('id').eq('user_id', userId).eq('body_hash', hash).limit(1);
  dupQuery = hasDate ? dupQuery.gte('received_at', new Date(received.getTime() - 15 * 60 * 1000).toISOString()).lte('received_at', new Date(received.getTime() + 15 * 60 * 1000).toISOString()) : dupQuery.gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());
  const { data: dup } = await dupQuery;
  if (dup && dup.length) return json({ ok: true, duplicate: true });

  const { data: configs } = await service.from('account_sms_config').select('*').eq('user_id', userId);
  const last4 = findLast4(normalizeDigits(body));
  const cfg = matchAccount(configs || [], sender, last4);
  const parsed = parseSms(body, cfg || {});

  const { error } = await service.from('sms_inbox').insert({
    user_id: userId,
    account_id: cfg ? cfg.account_id : null,
    sender: sender || null,
    body,
    received_at: received.toISOString(),
    txn_type: parsed.type,
    amount: parsed.amount,
    merchant: parsed.merchant || null,
    category: cfg?.default_category || null,
    status: 'pending',
    body_hash: hash,
  });
  if (error) { console.error('sms insert failed', error.message); return json({ ok: false, error: 'Could not save' }, 500); }
  return json({ ok: true, matched: !!cfg, parsed: { amount: parsed.amount, type: parsed.type } });
});
