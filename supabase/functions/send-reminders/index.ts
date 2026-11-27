import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Daily email reminders for upcoming recurring payments and installments.
// Called once a day by pg_cron (see supabase/migrations/20261127_reminders.sql), never by browsers.
// Secrets: REMINDERS_CRON_SECRET, RESEND_API_KEY, REMINDER_FROM_EMAIL (a sender verified in Resend), APP_URL (optional).
// Users opt in from Settings → Notifications (user_settings.settings.settingsPrefs.emailReminders).

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const iso = (d: Date) => d.toISOString().slice(0, 10);
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const secret = Deno.env.get('REMINDERS_CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'Forbidden' }, 403);

  const url = Deno.env.get('SUPABASE_URL'), serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY'), from = Deno.env.get('REMINDER_FROM_EMAIL');
  const appUrl = Deno.env.get('APP_URL') || '';
  if (!url || !serviceKey || !resendKey || !from) return json({ error: 'Missing server configuration' }, 503);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const today = iso(new Date());
  const { data: optedIn, error } = await db.from('user_settings').select('user_id, settings').eq('settings->settingsPrefs->>emailReminders', 'true');
  if (error) return json({ error: error.message }, 500);

  let sent = 0, skipped = 0;
  for (const row of optedIn || []) {
    const settings = row.settings || {};
    if (settings.remindersLastSent === today) { skipped++; continue; }
    const days = Math.min(14, Math.max(0, Number(settings.settingsPrefs?.reminderDays ?? 3)));
    const until = iso(new Date(Date.now() + days * 86400000));

    const { data: userRes } = await db.auth.admin.getUserById(row.user_id);
    const user = userRes?.user;
    const email = user?.email || '';
    if (!email || email.endsWith('@users.pocket.local')) { skipped++; continue; }
    const currency = String(user?.user_metadata?.currency || 'EGP');
    const money = (n: unknown) => { try { return new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(n) || 0); } catch { return `${Number(n) || 0} ${currency}`; } };

    const [{ data: bills }, { data: debts }] = await Promise.all([
      db.from('recurring_payments').select('name, amount, next_due_date').eq('user_id', row.user_id).eq('paid_this_cycle', false).not('next_due_date', 'is', null).lte('next_due_date', until).order('next_due_date'),
      db.from('debts').select('name, monthly_payment, remaining_amount, due_date').eq('user_id', row.user_id).gt('remaining_amount', 0).not('due_date', 'is', null).lte('due_date', until).order('due_date'),
    ]);
    const items = [
      ...(bills || []).map((b) => ({ name: b.name, amount: b.amount, due: b.next_due_date, kind: 'Bill' })),
      ...(debts || []).map((d) => ({ name: d.name, amount: Math.min(Number(d.monthly_payment) || 0, Number(d.remaining_amount) || 0) || d.remaining_amount, due: d.due_date, kind: 'Installment' })),
    ].sort((a, b) => String(a.due).localeCompare(String(b.due)));
    if (!items.length) { skipped++; continue; }

    const label = (due: string) => due < today ? 'Overdue' : due === today ? 'Due today' : `Due ${new Date(due + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    const rows = items.map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><b>${esc(i.name)}</b><br><span style="color:#888;font-size:12px">${i.kind} · ${label(i.due)}</span></td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${esc(money(i.amount))}</td></tr>`).join('');
    const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#222"><h2 style="font-size:18px">Coming up in Pocket</h2><table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>${appUrl ? `<p style="margin-top:20px"><a href="${esc(appUrl)}" style="background:#3355f5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open Pocket</a></p>` : ''}<p style="color:#999;font-size:12px;margin-top:24px">Pocket only reminds you; it never pays anything. Turn these emails off in Settings → Notifications.</p></div>`;
    const text = items.map((i) => `${i.name} — ${money(i.amount)} — ${label(i.due)}`).join('\n');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email], subject: `${items.length} payment${items.length === 1 ? '' : 's'} coming up`, html, text }),
    });
    if (!res.ok) { console.error('send-reminders: Resend failed', res.status, await res.text()); continue; }
    await db.from('user_settings').update({ settings: { ...settings, remindersLastSent: today } }).eq('user_id', row.user_id);
    sent++;
  }
  return json({ ok: true, sent, skipped });
});
