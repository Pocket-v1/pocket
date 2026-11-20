-- Live Inbox: send changes on conversations and messages to the app right away (row security still applies). Additive.
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then create publication supabase_realtime; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'support_messages') then alter publication supabase_realtime add table public.support_messages; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'support_replies') then alter publication supabase_realtime add table public.support_replies; end if;
end $$;
