-- Store each route's IANA timezone. Existing and new rows default to Monterrey.
alter table public.routes
add column if not exists timezone text not null default 'America/Monterrey';

update public.routes
set timezone = 'America/Monterrey'
where timezone is null or btrim(timezone) = '';

comment on column public.routes.timezone is
'IANA timezone used to interpret the route local start and end times.';
