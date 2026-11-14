// @ts-nocheck
// Help & contact: a signed-in user sends a message. It is saved in support_messages and emailed to the
// support inbox with the user's details, so you can reply straight from your email (Reply-To = the user).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TOPICS = { problem: 'Something is wrong', plus: 'Plus & payment', idea: 'An idea', other: 'Something else' };
const cairo = d => new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));

// Pocket design system (tokens): brand #3157f6, ink #131a3a / #222b55, gold #e9d8a6, text #171923, muted #6c7182, border #e5e8f0, ground #f7f8fa
function emailHtml(m, u, appUrl) {
  const row = (k, v) => v ? `<tr><td style="padding:9px 0;border-top:1px solid #e5e8f0;color:#6c7182;font-size:13px;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:9px 0;border-top:1px solid #e5e8f0;color:#171923;font-size:13px;font-weight:600;word-break:break-word">${v}</td></tr>` : '';
  const chip = (t, bg, fg) => `<span style="display:inline-block;padding:4px 10px;border-radius:99px;background:${bg};color:${fg};font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase">${esc(t)}</span>`;
  return `<!doctype html><html><body style="margin:0;background:#f7f8fa">
<div style="background:#f7f8fa;padding:28px 12px;font-family:Manrope,'Segoe UI',Arial,Helvetica,sans-serif">
 <div style="max-width:560px;margin:0 auto">
  <div style="background:#131a3a;border-radius:20px 20px 0 0;padding:22px 26px;color:#ffffff">
   <div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#e9d8a6">POCKET · HELP &amp; CONTACT</div>
   <div style="font-size:22px;font-weight:800;margin-top:8px;letter-spacing:-.02em">New message from ${esc(u.name || u.email)}</div>
   <div style="margin-top:12px">${chip(TOPICS[m.topic] || 'Message', '#e9d8a6', '#131a3a')} ${u.plus ? chip(u.plus, '#222b55', '#ffffff') : ''}</div>
  </div>
  <div style="background:#ffffff;border:1px solid #e5e8f0;border-top:0;border-radius:0 0 20px 20px;padding:24px 26px">
   <div style="font-size:11px;font-weight:800;letter-spacing:.08em;color:#6c7182">MESSAGE</div>
   <div style="margin-top:10px;padding:16px;border-radius:14px;background:#f5f6fb;color:#171923;font-size:15px;line-height:1.6;white-space:pre-wrap">${esc(m.message)}</div>
   <a href="mailto:${esc(u.email)}?subject=${encodeURIComponent('Re: your Pocket message')}" style="display:inline-block;margin-top:18px;background:#3157f6;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 20px;border-radius:12px">Reply to ${esc(u.firstName || 'them')}</a>
   <div style="margin-top:26px;font-size:11px;font-weight:800;letter-spacing:.08em;color:#6c7182">ABOUT THE USER</div>
   <table style="width:100%;border-collapse:collapse;margin-top:6px">
    ${row('Name', esc(u.name))}${row('Email', `<a href="mailto:${esc(u.email)}" style="color:#2449df">${esc(u.email)}</a>`)}${row('Username', esc(u.username))}
    ${row('Pocket Plus', esc(u.plus || 'No'))}${row('Accounts · transactions', esc(u.counts))}${row('Joined', esc(u.joined))}
    ${row('Sent from page', esc(m.page))}${row('Device', esc(m.device))}${row('Sent at', esc(cairo(m.created_at)) + ' (Cairo)')}${row('User ID', `<span style="font-family:monospace;font-size:12px">${esc(u.id)}</span>`)}
   </table>
   <div style="margin-top:22px;font-size:12px;color:#6c7182">Reply to this email to answer ${esc(u.firstName || 'the user')} directly. Message ID ${esc(m.id)} · <a href="${esc(appUrl)}" style="color:#2449df">Open Pocket</a></div>
  </div>
 </div>
</div></body></html>`;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL'), anon = Deno.env.get('SUPABASE_ANON_KEY'), role = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const to = Deno.env.get('SUPPORT_EMAIL') || 'pocket.egypt.app@gmail.com';
  const appUrl = Deno.env.get('APP_URL') || 'https://pocket-egypt.vercel.app';
  const auth = req.headers.get('authorization') || '';
  if (!auth) return json({ ok: false, error: 'Sign in first.' }, 401);
  const asUser = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ ok: false, error: 'Sign in first.' }, 401);
  const service = createClient(url, role, { auth: { persistSession: false } });
  // The support inbox's own Resend key: an Edge Function secret if set, else the server-only private_secrets table.
  let resendKey = Deno.env.get('SUPPORT_RESEND_API_KEY') || '';
  if (!resendKey) { const { data: sk } = await service.from('private_secrets').select('value').eq('name', 'SUPPORT_RESEND_API_KEY').maybeSingle(); resendKey = sk?.value || ''; }
  const from = 'Pocket Support <onboarding@resend.dev>';

  const { data: allowed } = await service.rpc('check_rate_limit', { p_key: `support:${user.id}`, p_max: 5, p_window_seconds: 3600 });
  if (allowed === false) return json({ ok: false, error: 'You sent a few messages already. Please wait a little and try again.' }, 429);

  let p = {}; try { p = await req.json(); } catch { /* empty */ }
  const message = String(p.message || '').trim().slice(0, 4000);
  if (!message) return json({ ok: false, error: 'Write your message first.' }, 400);
  const topic = TOPICS[p.topic] ? p.topic : 'other';
  const { data: m, error } = await service.from('support_messages').insert({ user_id: user.id, topic, message, page: String(p.page || '').slice(0, 80) || null, device: String(p.device || '').slice(0, 300) || null }).select().single();
  if (error) return json({ ok: false, error: 'Could not send. Please try again.' }, 500);

  const [{ data: prof }, { data: subs }, { count: acc }, { count: tx }] = await Promise.all([
    service.from('profiles').select('full_name,first_name,last_name,username,email,created_at').eq('id', user.id).maybeSingle(),
    service.from('subscriptions').select('status,period,trial_ends_at,current_period_end').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    service.from('financial_accounts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    service.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);
  const now = Date.now();
  const live = (subs || []).find(s => (s.status === 'trial' && new Date(s.trial_ends_at).getTime() > now) || (s.status === 'active' && (!s.current_period_end || new Date(s.current_period_end).getTime() > now)));
  const pending = (subs || []).find(s => s.status === 'pending');
  const name = prof?.full_name || [prof?.first_name, prof?.last_name].filter(Boolean).join(' ') || '';
  const u = {
    id: user.id, email: user.email || prof?.email || '', name, firstName: (prof?.first_name || name.split(' ')[0] || ''), username: prof?.username || '',
    plus: live ? (live.status === 'trial' ? 'Plus trial' : `Plus ${live.period}`) : pending ? 'Payment pending' : '',
    counts: `${acc ?? 0} · ${tx ?? 0}`, joined: prof?.created_at ? cairo(prof.created_at) : '',
  };

  let sent = false;
  if (resendKey) {
    const subject = `[Pocket] ${TOPICS[topic]} · ${u.name || u.email}`;
    const text = `${message}\n\n---\nFrom: ${u.name} <${u.email}>\nPlus: ${u.plus || 'No'}\nPage: ${m.page || '-'}\nDevice: ${m.device || '-'}\nUser ID: ${u.id}`;
    const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: u.email || undefined, subject, html: emailHtml(m, u, appUrl), text }) });
    sent = res.ok;
    if (!res.ok) console.error('support email failed', res.status, await res.text());
    if (sent) await service.from('support_messages').update({ email_sent: true }).eq('id', m.id);
  }
  return json({ ok: true, id: m.id, emailed: sent });
});
