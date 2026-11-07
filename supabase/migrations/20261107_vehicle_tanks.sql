create table if not exists public.vehicle_tanks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('petrol','diesel','gas','electric')),
  capacity numeric not null check (capacity > 0),
  created_at timestamptz not null default now()
);
create index if not exists vehicle_tanks_vehicle_id_idx on public.vehicle_tanks(vehicle_id);
create index if not exists vehicle_tanks_user_id_idx on public.vehicle_tanks(user_id);
alter table public.vehicle_tanks enable row level security;
drop policy if exists "Users manage own vehicle tanks" on public.vehicle_tanks;
create policy "Users manage own vehicle tanks" on public.vehicle_tanks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter table public.vehicle_fuel_logs add column if not exists tank_id uuid references public.vehicle_tanks(id) on delete set null;
create index if not exists vehicle_fuel_logs_tank_id_idx on public.vehicle_fuel_logs(tank_id);
