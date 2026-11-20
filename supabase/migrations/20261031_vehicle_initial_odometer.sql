-- Remember the odometer the user entered when adding a vehicle (additive; current_odometer keeps updating).
alter table public.vehicles add column if not exists initial_odometer numeric;
update public.vehicles v set initial_odometer = least(
  v.current_odometer,
  coalesce((select min(odometer) from public.vehicle_fuel_logs f where f.vehicle_id=v.id and f.odometer>0), v.current_odometer),
  coalesce((select min(odometer) from public.vehicle_service_records s where s.vehicle_id=v.id and s.odometer>0), v.current_odometer),
  coalesce((select min(last_service_odometer) from public.maintenance_plans p where p.vehicle_id=v.id and p.last_service_odometer>0), v.current_odometer)
) where initial_odometer is null;
