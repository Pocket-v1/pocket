-- Additive only: lets a service record point at an existing debt / installment plan.
alter table public.vehicle_service_records add column if not exists debt_id uuid references public.debts(id) on delete set null;
create index if not exists vehicle_service_records_debt_id_idx on public.vehicle_service_records(debt_id);
