-- Audit log: who changed what in administration. Additive; safe to run more than once.
-- Rows are written only by triggers (security definer). Nobody can edit or delete them from the app.

create table if not exists public.audit_log (
  id bigserial primary key,
  actor_id uuid,                 -- auth.uid() of the admin; null when done by the server (Edge Function / SQL)
  actor_label text not null default '',
  action text not null,
  target_id uuid,
  target_label text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;

create or replace function public.audit_actor_label(p_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(p.full_name, ''), nullif(p.username, ''), nullif(p.email, ''), 'Unknown')
  from public.profiles p where p.id = p_id
$$;
revoke all on function public.audit_actor_label(uuid) from public, anon, authenticated;

create or replace function public.audit_write(p_action text, p_target uuid, p_target_label text, p_details jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid();
begin
  insert into public.audit_log (actor_id, actor_label, action, target_id, target_label, details)
  values (v_actor, case when v_actor is null then 'Server' else coalesce(public.audit_actor_label(v_actor), 'Unknown') end,
          p_action, p_target, coalesce(p_target_label, ''), coalesce(p_details, '{}'::jsonb));
end;
$$;
revoke all on function public.audit_write(text, uuid, text, jsonb) from public, anon, authenticated;

-- Profiles: role and feature changes, account creation and deletion.
create or replace function public.audit_profiles()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_label text;
begin
  if tg_op = 'DELETE' then
    v_label := coalesce(nullif(old.full_name, ''), nullif(old.username, ''), old.email, '');
    perform public.audit_write('user.deleted', old.id, v_label, jsonb_build_object('role', old.role));
    return old;
  end if;
  v_label := coalesce(nullif(new.full_name, ''), nullif(new.username, ''), new.email, '');
  if tg_op = 'INSERT' then
    perform public.audit_write('user.created', new.id, v_label, jsonb_build_object('role', new.role, 'features', to_jsonb(new.enabled_features)));
    return new;
  end if;
  if new.role is distinct from old.role then
    perform public.audit_write('user.role_changed', new.id, v_label, jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  if new.enabled_features is distinct from old.enabled_features then
    perform public.audit_write('user.features_changed', new.id, v_label, jsonb_build_object(
      'added',   coalesce((select jsonb_agg(f) from unnest(new.enabled_features) f where not f = any(old.enabled_features)), '[]'::jsonb),
      'removed', coalesce((select jsonb_agg(f) from unnest(old.enabled_features) f where not f = any(new.enabled_features)), '[]'::jsonb)));
  end if;
  return new;
end;
$$;
drop trigger if exists audit_profiles_trg on public.profiles;
create trigger audit_profiles_trg after insert or update of role, enabled_features or delete on public.profiles
  for each row execute function public.audit_profiles();

-- Access requests: approve / deny / reopen.
create or replace function public.audit_access_requests()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    perform public.audit_write('access_request.' || new.status, new.user_id, coalesce(nullif(new.user_name, ''), new.user_email, ''),
      jsonb_build_object('from', old.status, 'to', new.status, 'request_id', new.id));
  end if;
  return new;
end;
$$;
drop trigger if exists audit_access_requests_trg on public.access_requests;
create trigger audit_access_requests_trg after update of status on public.access_requests
  for each row execute function public.audit_access_requests();

-- App settings: any global switch (approval mode, backup visibility, sign-up on/off).
create or replace function public.audit_app_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.value is distinct from old.value then
    perform public.audit_write('setting.changed', null, new.key,
      jsonb_build_object('from', case when tg_op = 'UPDATE' then old.value end, 'to', new.value));
  end if;
  return new;
end;
$$;
drop trigger if exists audit_app_settings_trg on public.app_settings;
create trigger audit_app_settings_trg after insert or update on public.app_settings
  for each row execute function public.audit_app_settings();

-- Read the log (Owner / Super Admin only).
create or replace function public.admin_list_audit_log(p_limit int default 200, p_before bigint default null)
returns setof public.audit_log language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_forma_admin() then raise exception 'Admin access required'; end if;
  return query select * from public.audit_log a
    where p_before is null or a.id < p_before
    order by a.id desc limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;
revoke all on function public.admin_list_audit_log(int, bigint) from public;
grant execute on function public.admin_list_audit_log(int, bigint) to authenticated;
