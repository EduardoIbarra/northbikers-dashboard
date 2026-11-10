alter table public.routes
    add column if not exists instructions_es text,
    add column if not exists instructions_en text;

update public.routes
set instructions_es = instructions
where instructions_es is null
  and instructions is not null;

comment on column public.routes.instructions_es is 'Spanish event mechanics/instructions PDF URL.';
comment on column public.routes.instructions_en is 'English event mechanics/instructions PDF URL.';

update public.routes
set instructions_es = 'https://aezxnubglexywadbjpgo.supabase.co/storage/v1/object/public/pictures/instructions/248/mecanica-rally-baja-adv-2026-es.pdf',
    instructions_en = 'https://aezxnubglexywadbjpgo.supabase.co/storage/v1/object/public/pictures/instructions/248/mecanica-rally-baja-adv-2026-en.pdf',
    instructions = 'https://aezxnubglexywadbjpgo.supabase.co/storage/v1/object/public/pictures/instructions/248/mecanica-rally-baja-adv-2026-es.pdf'
where id = 248
  and slug = 'rally-baja-adv-2026';
