# Pocket — Personal Finance System

Responsive personal-finance web app with Supabase authentication and per-user cloud storage.

## Features
- Email + password **Create Account** and **Sign In**
- Email confirmation flow, resend confirmation, password reset email, secure set-new-password screen, and sign out
- Per-user cloud data: transactions, budgets, savings goals, recurring payments, accounts/wallets, and debts/installments
- Dashboard, charts, category spending, monthly/yearly reports, Needs vs Wants
- Smart insights and a month-end expense estimate based on the current daily average
- Cash-flow calendar for recorded transactions and next recurring due dates
- Subscription and recurring-bill tracker with manual paid confirmation and duplicate-cycle protection
- Multiple accounts and wallets with opening balances and linked transaction activity
- Debt and installment tracking with remaining balance and next due date
- Budget-limit warnings at 80% and 100% of category limits
- Savings-goal milestones and monthly target guidance
- Multi-sheet yearly report export (monthly summary, categories, transactions)
- Add/edit/delete transactions and manage budgets, goals, and recurring payments
- Excel import and Excel export
- Row Level Security (RLS) policies on user data
- Local demo mode when Supabase credentials are not configured

## 1. Connect your existing Supabase project
1. In Supabase, open your project and go to **Project Settings → API** (or **API Keys**, depending on dashboard layout).
2. Copy the **Project URL** and the **publishable key** (or legacy `anon` public key). Never use a `service_role` or secret key in a browser app.
3. The included `.env` already contains this project’s local configuration. Keep it out of Git commits; set the same variables in Vercel Environment Variables for production:
4. Open **SQL Editor** in Supabase and run the complete contents of `supabase/schema.sql`.
5. In Vercel, set `VITE_SITE_URL` to the exact canonical HTTPS URL of the deployed Pocket app (the domain users actually open). Redeploy after changing it.
6. In Supabase **Authentication → URL Configuration**, set **Site URL** to that same production URL, without a wildcard, for example `https://your-pocket-domain.vercel.app`. Add these under **Redirect URLs**: `https://your-pocket-domain.vercel.app/**` and `http://localhost:5173/**` for local testing. Replace the example domain with your real Pocket domain.
7. Under **Authentication → Sign In / Providers → Email**, enable **Confirm email**.
8. Configure a custom SMTP provider for reliable delivery; the default Supabase mailer is heavily restricted and is not intended for production. See `supabase/email-setup.md` for exact settings and template content.

## 2. Run the app locally
Requires Node.js 20+.
```bash
npm install
npm run dev
```
Open the local URL printed by Vite, usually `http://localhost:5173`.

## 3. Deploy it
Deploy to Vercel or Netlify as a Vite app:
- Build command: `npm run build`
- Output directory: `dist`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the hosting dashboard.
- In Supabase Auth URL Configuration, add the deployed HTTPS URL to allowed redirect URLs and set the production Site URL.
- Redeploy after adding environment variables.

## Data and security
- Each account reads and writes only rows whose `user_id` matches its authenticated Supabase user ID. RLS enforces this at the database level.
- Use only the Supabase publishable/anon key in browser code. Never put a service-role or secret key in `.env` or frontend code.
- Existing data in the standalone HTML file is saved in that browser's local storage and is **not automatically migrated**. Export it first and import the workbook after signing in if needed.
- This source package is not yet connected to your project or deployed because your project URL/key and hosting access remain private to you. Follow the steps above to connect it.

## New profile, analytics, and backup features
- Profile settings let signed-in users update their display name, preferred currency, and greeting time zone. These preferences are stored in Supabase Auth user metadata; local demo mode stores them in the browser.
- Reports now include average daily expenses, average monthly expenses, and an expense transaction count for the selected year. The year selector is generated dynamically.
- Recurring payments can be marked paid to create a linked expense transaction and advance the next due date. This uses the `mark_recurring_payment_paid` database function so the two database changes happen together.
- `Auto-pay` is a tracking label only. The app does not initiate bank transfers or charge payment methods.
- Settings supports a full JSON backup of transactions, budgets, savings goals, recurring payments, and profile preferences, plus JSON restore. Treat backups as sensitive financial records and store them privately.

## Apply the database update
After updating the source code, run the updated `supabase/schema.sql` in the Supabase SQL Editor. It adds `last_paid_date` and the `mark_recurring_payment_paid` function. Do this before testing the recurring-payment Mark paid action. The function is scoped to `auth.uid()` and runs under the caller's RLS permissions.

## Validation note
The JSX source was transpiled with the installed TypeScript JSX parser and had no syntax diagnostics. A full Vite production build could not be run in this environment because dependency installation did not complete; run `npm install` and `npm run build` locally before deploying.


## Additional finance features
- Run the updated `supabase/schema.sql` in your existing Supabase project before using cloud accounts/wallets or debts. It adds `financial_accounts`, `debts`, and the optional `transactions.account_id` link, with row-level security policies for each new table.
- Account balances are calculated from the account's opening balance plus linked income minus linked expenses. Existing transactions are not automatically assigned to an account; edit a transaction to link it. Unlinked transactions do not affect any account balance.
- Cash-flow calendar shows recorded transaction dates and each recurring item's next due date. It does not invent salary dates or future transactions.
- Insights and month-end forecasts are estimates derived from recorded data. Budget alerts are displayed when a category reaches 80% of its limit, and at 100% they are marked over limit.
- Subscription and recurring-payment automation is intentionally confirmation-based: clicking “Mark paid” records an expense and advances the due date once. “Auto-pay” is informational only; Pocket never initiates transfers or card charges.
- Debt records are manually maintained; Pocket does not connect to lenders or automatically verify outstanding balances.
- Older JSON backups without `accounts` or `debts` remain restorable. Exported backups and reports contain financial information; store them privately.

## Owner, super-admin, and feature access
- The owner account is reserved for `mahmoudadel240@gmail.com`. The SQL migration assigns that role to the existing Supabase Auth account if it already exists, or assigns it when that email registers later.
- Every other newly created account receives the `user` role and an empty `enabled_features` list by default. Users do not see feature pages until the owner or a super admin enables them.
- The owner can promote a user to `super_admin` or demote a super admin. Super admins can manage feature visibility but cannot change account roles. The owner account cannot be changed from the admin UI.
- Admin controls live in **Administration → User access**. Feature grants are stored in `public.profiles`, not local storage or user-editable auth metadata.
- Run the full updated `supabase/schema.sql` in Supabase SQL Editor before deploying this version. It adds role/feature columns, reserves the owner email, and creates restricted admin RPC functions. Then redeploy the Vite app.
- Admin role changes are enforced by database functions and column-level permissions. Financial data continues to use per-user RLS. Never expose a Supabase service-role key in the frontend.
- If `mahmoudadel240@gmail.com` has not registered in Supabase Auth yet, create the account through Pocket after applying the schema. Confirm the email if Supabase email confirmation is enabled, then sign in to access the owner console.


## Appearance, sidebar, and backup visibility updates

The Settings & profile modal now supports Light/Dark themes, four accent presets (Pocket Classic, Soft Lavender, Ocean Blue, Forest Green), Comfortable/Compact/Wide sidebar layouts, and a selectable emoji avatar. Appearance preferences are saved in the current browser. The selected avatar is also saved in the signed-in user's Supabase auth metadata when the profile is saved.

Backup & restore is hidden from regular users by default. The Owner or Super Admin can enable **Show Backup & restore to regular users** in Settings. This global preference is stored in `public.app_settings` and protected by RLS; regular users can read it but cannot change it. Run the updated `supabase/schema.sql` migration before deploying this feature.

## Email confirmation setup (production)
1. In Supabase Dashboard, open **Authentication → Sign In / Providers → Email** (the exact label may vary) and enable **Confirm email**.
2. Open **Authentication → URL Configuration**. Set **Site URL** to `https://forma-three-lovat.vercel.app`.
3. Add these allowed **Redirect URLs**:
   - `https://forma-three-lovat.vercel.app/**`
   - `http://localhost:5173/**` (for local development only)
4. Keep the default Supabase signup confirmation email template using the confirmation URL (commonly `{{ .ConfirmationURL }}`), unless you intentionally customize it. If customizing, make sure its link still points to Supabase's confirmation endpoint.
5. Deploy the latest source. New registrations should show a message telling the user to check email. If a user tries to sign in before confirming, Pocket shows a confirmation notice and a **Resend confirmation email** action.
6. Test with a new email address: register, open the email, click the confirmation link, and then sign in. Check Spam/Junk if it does not arrive. Supabase's default email service has sending limits; for production volume, configure custom SMTP in Supabase Auth settings.

The frontend can request a confirmation email and resend it, but it cannot enable **Confirm email** in your Supabase project settings; that must be enabled in the Supabase Dashboard. The confirmation redirect uses the current app origin, so it must be present in the project's allowed Redirect URLs.

## Latest navigation update

- Removed the redundant “My finances” workspace switcher from the sidebar.
- Removed the personal name/profile row from the sidebar; account details are now in the top-right account menu.
- Added an account menu with display name, email, role, Account & profile settings, and Sign out for authenticated users.
- Made the notification bell open a notification popover listing upcoming unpaid recurring payments, with an action to open Recurring payments.
- The notification bell displays a dot when upcoming recurring payments exist.

The account menu and notification popover use the existing authenticated session and recurring-payment records; they do not introduce mock notifications or new backend tables.


## Authentication email delivery troubleshooting

- Set `VITE_SITE_URL` in Vercel to the canonical deployed Pocket URL and redeploy. The app uses it for signup confirmation, resend confirmation, and password recovery redirects, avoiding accidental redirects to temporary Vercel preview domains.
- Set Supabase **Site URL** to that same production origin and allow the production URL wildcard plus `http://localhost:5173/**` for local testing. Redirect URLs must be on the allow list or Supabase can reject/fallback from the requested redirect.
- The app now listens for Supabase's `PASSWORD_RECOVERY` event and supports setting and confirming a new password after opening the reset link.
- Use the standard Supabase `{{ .ConfirmationURL }}` in both confirmation and recovery email templates unless you intentionally implement a custom token-verification route.
- A successful API response means Supabase accepted the send request, not necessarily that the email reached the inbox. Check Auth logs, spam, sender-domain verification, and SMTP provider logs.


## Pocket typography
- Brand and headings: Sora (Google Fonts), with Manrope fallback.
- Interface, forms, tables, and data: Manrope (Google Fonts), with Arial/sans-serif fallback.
- Wordmark: Pocket.


## Pocket Insights Dashboard refresh
- Refreshed dashboard visual system with structured cards, clearer data hierarchy, modern admin-style navigation, and blue insight accents.
- Appearance settings expose only Light/Dark theme selection; design preset and sidebar density controls are removed from the Settings UI.
- Typography remains Sora for brand/headings and Manrope for UI/data.


## Google sign-in setup
- The login and sign-up screens include **Continue with Google**, using Supabase OAuth (`signInWithOAuth`); existing email/password, email confirmation, and password reset flows remain available.
- In Supabase, open **Authentication → Sign In / Providers → Google**, enable Google, and add the Google OAuth Client ID and Client Secret from Google Cloud Console.
- In Google Cloud Console, configure the OAuth consent screen and add the Supabase project's callback URL shown in the Supabase Google provider settings (typically `https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI.
- In Supabase **Authentication → URL Configuration**, ensure the deployed Pocket URL is the Site URL and is included in Redirect URLs. The app sends `VITE_SITE_URL` (or the current origin) as the post-login redirect.
- Google sign-in will not complete until these provider settings are configured in Supabase; no client secret belongs in the frontend or `.env` file.


## Gender-personalized categories and transfers

- During email sign-up, users can choose Female, Male, or Prefer not to say. The choice is stored in Supabase Auth user metadata and only personalizes suggested categories; it does not restrict access to custom categories.
- Transaction types include Expense, Income, and Transfer. Transfers move an amount from one account/wallet to another and are excluded from income/expense totals.
- The consolidated `supabase/schema.sql` includes the transfer columns and all current schema changes. Run that single file in Supabase SQL Editor.
- Google OAuth sign-ups may not have a gender choice during the Google consent flow; those accounts use the shared core categories until the user chooses a gender in a future profile update.


## Transaction subcategories
- The transaction form now shows a category and a dependent subcategory selector.
- The consolidated `supabase/schema.sql` includes the transaction subcategory column and category migration.
- `.env` is included with the requested local values; do not commit it to GitHub. Configure the same variables in Vercel Environment Variables.

### Admin user deletion
The consolidated `supabase/schema.sql` includes the guarded `admin_delete_user` function. The owner cannot be deleted, users cannot delete themselves from the admin list, and only the owner can delete a super admin. Deleting a user cascades their personal Pocket records. For an existing database, run the full consolidated schema file once in Supabase SQL Editor.


## Add/Edit Wizard UI updates

The account/wallet, budget, savings goal, recurring payment, and debt forms now follow a card-first multi-step wizard pattern. Savings goals open in a dedicated full-screen creation/edit experience. Sidebar **Settings** is separate from the account-menu **Account & profile** screen. The consolidated schema safely adds `goal_type` to `savings_goals`, `debt_type` to `debts`, and `subcategory` to `recurring_payments`. Run `supabase/schema.sql` in Supabase SQL Editor to apply the additive columns before deploying.


## Access requests (server-side email)

New users are no longer forced through the first-account setup wizard. They can request access from the access-restricted screen. The administrator email is stored only in Supabase Edge Function secrets and is never rendered in the client.

To enable delivery, apply `supabase/migrations/20261018_access_requests.sql`, deploy the `request-access` Edge Function, and set these Edge Function secrets in Supabase (never put them in Vite `.env`):

- `ACCESS_REQUEST_ADMIN_EMAIL` = `mahmoudadel240@gmail.com`
- `RESEND_API_KEY` = your Resend API key
- `ACCESS_REQUEST_FROM_EMAIL` = a sender address verified in your Resend account

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions in the hosted environment. If your project requires manual setup, set them as server-side function secrets only. The frontend calls the function with the signed-in session.

The notification email is sent by the server through Resend, not from the user's email client, and the admin address is not exposed in the UI. Requests are rate-limited to one pending request per user per 24 hours.

## Account defaults, debt payments, and savings goal transfers

- In **Accounts & wallets**, use **Set as default account** on an account card. The selection is stored in this browser and preselected for new transactions.
- The transaction wizard now asks for the account on step 2 and offers **Add account** in the same flow.
- The **Debt** section on Transactions lets you choose the account used to pay an installment. Recording it creates an expense transaction linked to the debt and updates the debt's paid amount, remaining amount, installment count, and progress.
- Run `supabase/migrations/20261018_transaction_debt_link.sql` in Supabase SQL Editor before recording debt payments in the hosted app.
- Savings-goal linked transfers are counted as deposits when moving into a Savings account and subtracted when moving out of a Savings account. For reliable direction detection, mark the account that holds the goal funds as type **Savings account**.

Build verification note: `npm install` could not reach npm registry in the current environment, so run `npm install` and `npm run build` locally before deploying.

## Goals system account setup

Apply `supabase/migrations/20261018_goals_system_account.sql` in the Supabase Dashboard SQL Editor (or run the updated `supabase/schema.sql`) before deploying this version. The migration adds a protected system account named **Goals** with type **Savings account**, backfills it for existing users, and creates it automatically for new sign-ups. It also prevents the system account from being renamed, edited, or deleted.

Transfers to or from **Goals** must be linked to one savings goal. Transfers into Goals increase that goal's saved amount; transfers out reduce it. Goals transfers remain transfers and are not counted as income or expenses.

## Admin-created username accounts (Supabase Cloud)

This update adds Owner/Super Admin account creation from **User access**. The email field is optional. When omitted, the account uses a non-deliverable internal auth address (`username@users.pocket.local`) and signs in with its username. Because that address cannot receive mail, password reset and email confirmation are unavailable for username-only accounts; provide an email if recovery is needed.

Before deploying the frontend:

1. Run `supabase/migrations/20261020_admin_create_username_users.sql` in the Supabase SQL Editor.
2. Deploy the Edge Function `admin-create-user` from `supabase/functions/admin-create-user`. It uses the project's server-side `SUPABASE_SERVICE_ROLE_KEY`; never put that key in frontend `.env` or commit it.
3. Deploy the updated frontend.

The Edge Function verifies the caller's authenticated user and role on the server. Super Admins can create regular users; only the Owner can create a Super Admin. The User access page includes a Refresh action to reload the current user list without refreshing the entire app.

## Workspace loading and recovery improvements

- The branded Pocket loading screen is reserved for auth/session restoration and access-profile verification.
- A responsive skeleton is shown while the signed-in user's workspace data loads, rather than rendering empty financial cards.
- Failed workspace queries are reported with a Retry action; successful tables still render while failed tables can be retried.
- Access-profile loading errors are shown explicitly and can be retried.
- Session restoration failures are caught and return the user to sign-in instead of leaving the app on an infinite loader.
- The last visited page continues to persist in the same browser. Role/feature checks remain in place before protected page content is rendered; database RLS and server-side authorization must still be configured in Supabase for security.

Build note: `npm install` could not complete in the current build environment due to a timeout, so the full Vite production build was not verified here. `src/main.jsx` was checked for JSX/JavaScript syntax errors using the available TypeScript transpiler.


## User Access Wizard Updates (2026-10-20)

The Create User wizard now follows Role → Features → Review. First Name and Last Name are required, Gender is optional, names are title-cased, and the full name is used in the workspace greeting. The Accounts navigation/page label is now “Accounts”.

Before deploying this update to Supabase Cloud, apply `supabase/migrations/20261020_user_profile_name_gender.sql`, then deploy the `admin-create-user` Edge Function. Do not expose the service-role key in the frontend.


### Opening balance date migration
For an existing Supabase project, run `supabase/migrations/20261020_add_opening_balance_date.sql` in the Supabase SQL Editor. Existing accounts are backfilled to their original `created_at` date. New and edited accounts save an explicit opening balance date, used by Insights & Reports.


## Access Management UI refinements (2026-10-23)
- Added live Total/Pending request badges in the Administration sidebar using the existing `admin_list_access_requests` RPC.
- Added a refresh event after request-list loads so counters update after approvals/status changes.
- Changed Users cards into a compact responsive list.
- Styled request filter dropdown and native options for light/dark themes.
- Kept existing schema and migrations unchanged.


## Update 2026-11-27: fixes and new features (on top of the deployed version)

Built on the code deployed from `pocket-update-oct29` (commit 8e15e92). The existing design, CSS, pages and functions are unchanged: a pixel comparison of every main page against that deploy showed no differences besides the new items listed here.

**Before deploying:** run these in the Supabase SQL Editor (they are also appended to `supabase/schema.sql`):
`20261127_audit_log.sql`, `20261127_budget_rollover.sql`, `20261127_multi_currency.sql`, then redeploy the Edge Functions.

**Fixes**
- Username/email checks in `public-signup` and `admin-create-user` no longer treat `_` as a wildcard (`a_b` used to collide with `axb`).
- Recurring due dates: a monthly item due on the 31st moves to Feb 28/29 instead of skipping to March 3.
- Optional: set the Edge Function secret `ALLOWED_ORIGIN` to your app URL to limit CORS (unset = unchanged `*`).
- Pages and the Excel library load on demand: first-load JavaScript ~857 KB → ~496 KB gzipped. Excel imports are capped at 5 MB.

**New**
- Installable app (PWA); the app shell opens offline, financial data is never cached.
- Arabic with right-to-left layout: Settings → Preferences → Language (per device). Strings in `src/lib/i18n/ar.js`.
- Multi-currency accounts with an exchange rate; reports convert to the main currency; cross-currency transfers record the amount received. Amounts now follow the user's chosen currency.
- Budget rollover, month-over-month comparison, copy last month's budgets.
- Device notifications: Settings → Notifications → "Notifications on this device" (the existing email reminders are unchanged).
- Administration → Audit log (written by database triggers).
- Optional Sentry error monitoring: set `VITE_SENTRY_DSN` in Vercel.
- `npm run lint`, `npm test` and a GitHub Actions CI workflow.
