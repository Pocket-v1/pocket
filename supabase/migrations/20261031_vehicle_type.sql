-- Vehicle type (Car / Motorcycle / Truck / Bus) so the make list can be filtered. Additive.
alter table public.vehicles add column if not exists vehicle_type text not null default 'Car';
update public.vehicles set vehicle_type='Motorcycle / Scooter' where make in ('Yamaha','Kawasaki','Vespa','Piaggio','Bajaj','TVS','Royal Enfield','KTM','Ducati','Harley-Davidson','Triumph','SYM','Benelli','CFMoto','Hero','Keeway','Zontes','Voge','Aprilia','Husqvarna','Moto Guzzi','MV Agusta','Suzuki Motorcycles','Honda Motorcycles');
