import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withCors } from '../_shared/cors.ts';

// Sign-up WITHOUT an email: the account signs in with a username. (Sign-up with an email uses normal Supabase auth.)
const MAX_ATTEMPTS = 5;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(withCors(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Sign-up is temporarily unavailable.' }, 503);

  let body: { username?: unknown; password?: unknown; full_name?: unknown; gender?: unknown; avatar?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  const fullName = String(body.full_name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const gender = ['male', 'female', 'prefer_not_to_say'].includes(String(body.gender)) ? String(body.gender) : 'prefer_not_to_say';
  if (!fullName) return json({ error: 'Enter your name.' }, 400);
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) return json({ error: 'Username must be 3–32 characters: letters, numbers, dots, underscores or hyphens.' }, 400);
  if (password.length < 8) return json({ error: 'Use a password with at least 8 characters.' }, 400);

  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Admins can switch username sign-up off (app_settings.public_signup_enabled = false).
  const { data: signupSetting } = await service.from('app_settings').select('value').eq('key', 'public_signup_enabled').maybeSingle();
  if (signupSetting?.value === false) return json({ error: 'Sign-up is closed right now. Please contact the administrator.' }, 403);

  // At most MAX_ATTEMPTS sign-up attempts per IP per hour.
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: rateError } = await service.from('signup_attempts').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', since);
  if (rateError) return json({ error: 'Sign-up is temporarily unavailable.' }, 503);
  if ((count ?? 0) >= MAX_ATTEMPTS) return json({ error: 'Too many sign-up attempts. Try again in an hour.' }, 429);
  await service.from('signup_attempts').insert({ ip });

  // ilike treats _ and % as wildcards; escape them so "a_b" only matches "a_b" (case-insensitive).
  const usernamePattern = username.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: taken, error: lookupError } = await service.from('profiles').select('id').ilike('username', usernamePattern).limit(1);
  if (lookupError) return json({ error: 'Could not check the username. Try again.' }, 500);
  if (taken?.length) return json({ error: 'That username is already taken.' }, 409);

  const [firstName, ...rest] = fullName.split(' ');
  const { error: createError } = await service.auth.admin.createUser({
    email: `${username.toLowerCase()}@users.pocket.local`,
    password,
    email_confirm: true,
    user_metadata: { username, first_name: firstName, last_name: rest.join(' '), full_name: fullName, gender, avatar: String(body.avatar || '').slice(0, 200) || undefined },
  });
  if (createError) return json({ error: /already/i.test(createError.message) ? 'That username is already taken.' : createError.message }, 400);
  return json({ ok: true });
}));
