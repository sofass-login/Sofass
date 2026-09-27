-- Datos de la app de tienda (public/app.html).
-- Ejecuta este archivo una vez en Supabase > SQL Editor.

create table if not exists public.app_docs (
  collection text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

alter table public.app_docs enable row level security;

drop policy if exists "app_docs lectura" on public.app_docs;
create policy "app_docs lectura" on public.app_docs
  for select to authenticated using (true);

drop policy if exists "app_docs alta" on public.app_docs;
create policy "app_docs alta" on public.app_docs
  for insert to authenticated with check (true);

drop policy if exists "app_docs cambio" on public.app_docs;
create policy "app_docs cambio" on public.app_docs
  for update to authenticated using (true) with check (true);

drop policy if exists "app_docs borrado" on public.app_docs;
create policy "app_docs borrado" on public.app_docs
  for delete to authenticated using (true);

-- Actualiza solo los campos indicados de un documento.
create or replace function public.app_doc_merge(p_collection text, p_id text, p_patch jsonb)
returns jsonb
language sql
security invoker
as $$
  update public.app_docs
     set data = data || p_patch, updated_at = now()
   where collection = p_collection and id = p_id
  returning data;
$$;

-- Cambios en directo entre dispositivos.
alter table public.app_docs replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.app_docs;
exception when duplicate_object then null;
end $$;
