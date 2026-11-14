-- New users (self sign-up or approved request) start with the 8 basic pages only.
-- Vehicles, Bank SMS and the chat come with Pocket Plus (or the Owner turns them on per user).
-- The Users page may now turn on 'chat' too. Existing users keep the pages they already have.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.handle_new_user'::regproc);
  d := replace(d, $q$array['overview','transactions','accounts','calendar','budgets','goals','subscriptions','debts','insights','expense_categories','vehicle_management']$q$,
                  $q$array['overview','transactions','accounts','budgets','goals','subscriptions','debts','insights']$q$);
  execute d;
  d := pg_get_functiondef('public.admin_update_access_request'::regproc);
  d := replace(d, $q$'overview','transactions','accounts','calendar','budgets','goals','subscriptions','debts','insights','expense_categories','vehicle_management'$q$,
                  $q$'overview','transactions','accounts','budgets','goals','subscriptions','debts','insights'$q$);
  execute d;
  d := pg_get_functiondef('public.admin_update_user_access'::regproc);
  d := replace(d, $q$'subscriptions','debts','insights','reports','expense_categories','vehicle_management','bank_sms'$q$,
                  $q$'subscriptions','debts','insights','reports','expense_categories','vehicle_management','bank_sms','chat'$q$);
  execute d;
end $$;
