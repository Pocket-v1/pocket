-- Simple fixed-window rate limiter used by Edge Functions (service role only).
create table if not exists public.rate_limits (
  key text primary key,
  hits integer not null default 0,
  window_start timestamptz not null default now()
);
alter table public.rate_limits enable row level security;   -- no policies: nobody but the service role can touch it
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare r public.rate_limits;
begin
  insert into public.rate_limits as rl (key, hits, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    hits = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.hits + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning * into r;
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return r.hits <= p_max;
end;
$$;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- Explicit deny: only the service role (which bypasses RLS) may use the limiter table.
drop policy if exists "No direct access" on public.rate_limits;
create policy "No direct access" on public.rate_limits for all to authenticated using (false) with check (false);
