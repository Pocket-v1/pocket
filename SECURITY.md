# Pocket — security notes

What protects Pocket, where it lives, and what still needs a human.

## 1. Row Level Security (RLS)
- Every table in `public` has RLS **on**. User data tables (`transactions`, `financial_accounts`, `debts`, `budgets`, `recurring_payments`, `savings_goals`, `user_settings`, vehicles…) allow a signed-in user to read/write **only rows where `user_id = auth.uid()`**.
- Policies apply to the `authenticated` role only. The anonymous role has **no** table privileges at all (`20261031_security_rls_and_grants.sql`), and signed-in users cannot `TRUNCATE`.
- `profiles`: users can only update `full_name`/`updated_at` of their own row (column-level grant) — they cannot change their own `role` or `enabled_features`.
- Admin actions go through `SECURITY DEFINER` RPCs (`admin_*`) that re-check the caller's role inside the function.
- Rule for new tables: `enable row level security` + an owner policy **in the same migration**. Run the Supabase security advisor after each migration.

## 2. Authentication
- Supabase Auth (email/password, username sign-in via `@users.pocket.local`, optional Google).
- Edge Functions: `request-access`, `admin-create-user` require a valid JWT (`verify_jwt = true`); `admin-create-user` also checks `owner`/`super_admin` in `profiles`. `public-signup` and `send-notification-emails` are public on purpose (the second one requires `x-cron-secret`, compared in constant time, or a signed-in user for test emails).
- Sign-up rejects passwords containing the username or common passwords (server side) and requires 8+ characters.
- The sign-in form backs off after repeated failures (`src/lib/loginThrottle.js`: 30 s → 1 min → 2 min → 5 min → 15 min).
- **Manual (Supabase dashboard → Authentication):** turn on *Leaked password protection*, set minimum password length to 8+, keep *Confirm email* on for email sign-ups, and review the built-in *Rate limits* page.

## 3. Rate limiting
- `public.rate_limits` + `public.check_rate_limit(key, max, window_seconds)` (service role only) — a fixed-window counter.
- Limits: sign-up 5/hour per IP and 200/hour overall (fails closed); access request 3/hour per user; admin create-user 30/hour per admin; test email 5/hour per user; wrong cron secret 10 per 10 min per IP.
- Supabase Auth applies its own limits to sign-in, sign-up and email sending; tune them in the dashboard.

## 4. Secrets
- Browser code only ever gets `VITE_SUPABASE_URL` and the publishable/anon key. They are public by design.
- `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `EMAIL_FROM`, `APP_URL` live **only** as Edge Function secrets (Supabase → Edge Functions → Secrets), never in git, never in `VITE_*`.
- `.env*` files are git-ignored (except `.env.example`). `node_modules/` and `dist/` are ignored too.
- `npm run check:secrets` scans tracked files for keys/JWTs and for client code that reads secret-looking env vars. Run it before pushing.
- **Vercel:** this app is a static SPA, so it only needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The Supabase integration also added `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET` and `POSTGRES_*`. They are marked sensitive and are not bundled (Vite only exposes `VITE_*`), but nothing uses them — remove them from the Vercel project to shrink the blast radius.
- If a key ever leaks: rotate it in Supabase (Settings → API / JWT), update the Edge Function secret, redeploy.
