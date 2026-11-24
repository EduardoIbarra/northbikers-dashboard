alter table public.checkpoints
    add column if not exists description_en text;
