import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Daily email digest of Pocket reminders (recurring payments + debts/installments).
// Called by pg_cron with header x-cron-secret, or by a signed-in user with { "test": true }.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// ---- Rate limiting (fixed window, stored in public.rate_limits via check_rate_limit) ----
const clientIp = (req: Request) => (req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'unknown').trim();
async function allow(service: any, key: string, max: number, windowSeconds: number, failOpen = true) {
  const { data, error } = await service.rpc('check_rate_limit', { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) { console.error('rate limit check failed', error.message); return failOpen; }
  return data === true;
}
// Constant-time comparison so the secret cannot be guessed from response timing.
const safeEqual = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const TOO_MANY = 'Too many attempts. Please wait a little and try again.';
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const cairoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
const plusDays = (day: string, n: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

type Item = { name: string; when: string; amount: number; overdue: boolean; kind: string };

function debtLead(notes: string) {
  const m = String(notes || '').match(/\[POCKET_DEBT_DETAILS\]\s*(\{[^\n]*\})/);
  try { const r = m ? JSON.parse(m[1]).reminder : ''; return r === '1 week before' ? 7 : r === '1 day before' ? 1 : r === 'On due date' ? 0 : 2; } catch { return 2; }
}

async function buildItems(service: any, userId: string, settings: any, today: string): Promise<Item[]> {
  const items: Item[] = [];
  if (settings.recurringAlerts !== false) {
    const { data } = await service.from('recurring_payments').select('name,amount,next_due_date,paid_this_cycle').eq('user_id', userId);
    for (const r of data || []) {
      if (r.paid_this_cycle || !r.next_due_date || r.next_due_date > plusDays(today, 2)) continue;
      items.push({ name: r.name, when: r.next_due_date, amount: Number(r.amount || 0), overdue: r.next_due_date < today, kind: 'Recurring payment' });
    }
  }
  if (settings.debtAlerts !== false) {
    const { data } = await service.from('debts').select('name,monthly_payment,remaining_amount,due_date,notes').eq('user_id', userId);
    for (const d of data || []) {
      if (!(Number(d.remaining_amount || 0) > 0) || !d.due_date) continue;
      if (d.due_date > plusDays(today, debtLead(d.notes))) continue;
      items.push({ name: d.name, when: d.due_date, amount: Number(d.monthly_payment || d.remaining_amount || 0), overdue: d.due_date < today, kind: 'Debt / installment' });
    }
  }
  return items.sort((a, b) => a.when.localeCompare(b.when));
}

function render(name: string, items: Item[], currency: string, appUrl: string) {
  const money = (n: number) => `${currency} ${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  const rows = items.map((i) => `<tr><td style="padding:12px 0;border-bottom:1px solid #eceef5"><div style="font-weight:700;color:#1d2230">${esc(i.name)}</div><div style="font-size:12px;color:#7b8396">${esc(i.kind)}</div></td><td style="padding:12px 0;border-bottom:1px solid #eceef5;text-align:right"><div style="font-weight:700;color:#1d2230">${money(i.amount)}</div><div style="font-size:12px;font-weight:700;color:${i.overdue ? '#d9485f' : '#b7791f'}">${i.overdue ? 'Overdue' : 'Due'} · ${esc(i.when)}</div></td></tr>`).join('');
  const html = `<div style="background:#f5f6fb;padding:28px 12px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px"><div style="font-size:20px;font-weight:800;color:#3b4bff;margin-bottom:4px">Pocket</div><h1 style="font-size:20px;margin:14px 0 6px;color:#1d2230">${esc(name ? `Hi ${name}, y` : 'Y')}ou have ${items.length} reminder${items.length === 1 ? '' : 's'}</h1><p style="margin:0 0 12px;color:#7b8396;font-size:14px">Here is what needs your attention.</p><table style="width:100%;border-collapse:collapse">${rows}</table><a href="${esc(appUrl)}" style="display:inline-block;margin-top:22px;background:#3b4bff;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">Open Pocket</a><p style="margin:22px 0 0;color:#9aa1b3;font-size:12px">You can turn these emails off any time in Pocket → Settings → Notification Preferences.</p></div></div>`;
  const text = `You have ${items.length} reminder(s):\n` + items.map((i) => `- ${i.name}: ${money(i.amount)} (${i.overdue ? 'overdue' : 'due'} ${i.when})`).join('\n') + `\n\nOpen Pocket: ${appUrl}`;
  return { html, text };
}

async function sendEmail(apiKey: string, from: string, to: string, subject: string, html: string, text: string) {
  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, html, text }) });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL'), anon = Deno.env.get('SUPABASE_ANON_KEY'), role = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  let resendKey = Deno.env.get('RESEND_API_KEY') || '', cronSecret = Deno.env.get('CRON_SECRET') || '';
  const from = Deno.env.get('EMAIL_FROM') || 'Pocket <onboarding@resend.dev>';
  const appUrl = Deno.env.get('APP_URL') || 'https://pocket-egypt.vercel.app';
  if (!url || !anon || !role) return json({ ok: false, error: 'Server configuration is incomplete.' }, 503);
  const service = createClient(url, role, { auth: { persistSession: false, autoRefreshToken: false } });
  // Fallbacks kept in the server-only private_secrets table (set in the database, never in code).
  let dbCron = '';
  {
    const { data: rows } = await service.from('private_secrets').select('name,value').in('name', ['CRON_SECRET', 'RESEND_API_KEY']);
    for (const r of rows || []) { if (r.name === 'CRON_SECRET') dbCron = r.value; if (r.name === 'RESEND_API_KEY' && !resendKey) resendKey = r.value; }
  }
  if (!resendKey) return json({ ok: false, error: 'Email sending is not set up yet (RESEND_API_KEY missing).' }, 503);
  const body = await req.json().catch(() => ({}));
  const today = cairoToday();

  const sendFor = async (userId: string, force: boolean) => {
    const { data: row } = await service.from('user_settings').select('settings').eq('user_id', userId).maybeSingle();
    const settings = (row?.settings && typeof row.settings === 'object') ? row.settings : {};
    if (!force && settings.emailAlerts !== true) return 'off';
    if (!force && settings.emailLastSent === today) return 'already-sent';
    const { data: au } = await service.auth.admin.getUserById(userId);
    const email = au?.user?.email || '';
    if (!email || email.endsWith('@users.pocket.local') || !au?.user?.email_confirmed_at) return 'no-verified-email';
    const items = await buildItems(service, userId, settings, today);
    if (!items.length && !force) return 'nothing-due';
    const name = String(au.user.user_metadata?.full_name || au.user.user_metadata?.name || '').split(' ')[0];
    const currency = String(settings.currency || 'EGP');
    const list = items.length ? items : [{ name: 'Test reminder', when: today, amount: 0, overdue: false, kind: 'Email check' } as Item];
    const { html, text } = render(name, list, currency, appUrl);
    await sendEmail(resendKey, from, email, items.length ? `Pocket: ${items.length} reminder${items.length === 1 ? '' : 's'} for you` : 'Pocket test email', html, text);
    if (!force) await service.from('user_settings').update({ settings: { ...settings, emailLastSent: today } }).eq('user_id', userId);
    return 'sent';
  };

  try {
    // Signed-in user asking for a test email to themselves.
    if (body?.test) {
      const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
      const { data: { user } } = await caller.auth.getUser();
      if (!user) return json({ ok: false, error: 'Sign in is required.' }, 401);
      if (!(await allow(service, `emailtest:${user.id}`, 5, 3600))) return json({ ok: false, error: TOO_MANY }, 429);
      const r = await sendFor(user.id, true);
      return r === 'sent' ? json({ ok: true, result: r }) : json({ ok: false, error: r === 'no-verified-email' ? 'Add and verify your email first.' : r }, 400);
    }
    // Daily run from pg_cron.
    const given = req.headers.get('x-cron-secret') || '';
    if (!((cronSecret && safeEqual(given, cronSecret)) || (dbCron && safeEqual(given, dbCron)))) {
      await allow(service, `cronbad:${clientIp(req)}`, 10, 600);
      return json({ ok: false, error: 'Not allowed.' }, 401);
    }
    const { data: users } = await service.from('user_settings').select('user_id').filter('settings->>emailAlerts', 'eq', 'true');
    const summary: Record<string, number> = {};
    for (const u of users || []) {
      try { const r = await sendFor(u.user_id, false); summary[r] = (summary[r] || 0) + 1; } catch (e) { console.error('digest failed', u.user_id, String(e)); summary.failed = (summary.failed || 0) + 1; }
    }
    return json({ ok: true, summary });
  } catch (e) {
    console.error('send-notification-emails', String(e));
    return json({ ok: false, error: 'Could not send the email. Check the Resend key and sender address.' }, 500);
  }
});
