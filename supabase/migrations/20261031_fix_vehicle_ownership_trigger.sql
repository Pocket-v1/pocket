-- Fix: adding a maintenance plan failed with 'record "new" has no field "transaction_id"'.
-- The shared trigger function read NEW.transaction_id for every table; now it only does so for service records.
create or replace function public.pocket_validate_vehicle_ownership()
returns trigger language plpgsql set search_path to 'public' as $function$
declare v_owner uuid; tx_owner uuid; tx_id uuid;
begin
  select user_id into v_owner from public.vehicles where id = new.vehicle_id;
  if v_owner is null or v_owner <> new.user_id then raise exception 'Vehicle does not belong to this user'; end if;
  if tg_table_name = 'vehicle_service_records' then
    tx_id := (to_jsonb(new) ->> 'transaction_id')::uuid;
    if tx_id is not null then
      select user_id into tx_owner from public.transactions where id = tx_id;
      if tx_owner is null or tx_owner <> new.user_id then raise exception 'Linked transaction does not belong to this user'; end if;
    end if;
  end if;
  return new;
end $function$;
