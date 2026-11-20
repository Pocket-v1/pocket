-- Friends v3 fixes (applied in Supabase as "friends_v3_fixes"). Additive.
alter table public.loans_given add column if not exists requested_by uuid;
alter table public.loans_given add column if not exists split_category text;
alter table public.loans_given add column if not exists share_responded_at timestamptz;
-- Confirmed shared loans can't be deleted (close them instead).
drop policy if exists "own loans_given delete" on public.loans_given;
create policy "own loans_given delete" on public.loans_given for delete using (user_id = auth.uid() and not (friend_id is not null and share_status = 'confirmed'));
-- Functions updated: loan_request_from_friend (sets requested_by), loan_request_respond and loan_respond
-- (set share_responded_at; split shares need no account), new loan_resend(loan, amount, note),
-- loans_i_owe (stays visible after unfriending once confirmed; returns split and request fields).
