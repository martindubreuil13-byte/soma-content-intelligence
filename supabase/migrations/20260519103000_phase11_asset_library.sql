-- Phase 11: organization asset library.
-- User-controlled brand assets, screenshots, documents, and references are
-- cataloged in Postgres and stored privately in Supabase Storage.

create table if not exists public.organization_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  asset_type text not null,
  name text not null,
  description text,
  storage_bucket text not null default 'generated-assets',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  original_filename text,
  tags jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.organization_assets enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.organization_assets to authenticated;

drop policy if exists "organization_assets_select_own_org" on public.organization_assets;
create policy "organization_assets_select_own_org"
on public.organization_assets
for select
to authenticated
using (organization_id = any(public.user_org_ids()));

drop policy if exists "organization_assets_insert_own_org" on public.organization_assets;
create policy "organization_assets_insert_own_org"
on public.organization_assets
for insert
to authenticated
with check (organization_id = any(public.user_org_ids()));

drop policy if exists "organization_assets_update_own_org" on public.organization_assets;
create policy "organization_assets_update_own_org"
on public.organization_assets
for update
to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

drop policy if exists "organization_assets_delete_own_org" on public.organization_assets;
create policy "organization_assets_delete_own_org"
on public.organization_assets
for delete
to authenticated
using (organization_id = any(public.user_org_ids()));

create index if not exists organization_assets_org_idx on public.organization_assets(organization_id);
create index if not exists organization_assets_type_idx on public.organization_assets(asset_type);
create index if not exists organization_assets_active_idx on public.organization_assets(is_active);
create index if not exists organization_assets_created_at_idx on public.organization_assets(created_at);
create index if not exists organization_assets_uploaded_by_idx on public.organization_assets(uploaded_by);

-- Storage bucket setup is intentionally manual.
-- Create a private Supabase Storage bucket named "generated-assets".
--
-- Asset upload path convention:
--   organizations/{organization_id}/assets/{asset_type}/{asset_id}/{safe_filename}
--
-- Required storage.objects policies for private, organization-scoped access:
--
-- create policy "generated_assets_read_own_org_path"
-- on storage.objects
-- for select
-- to authenticated
-- using (
--   bucket_id = 'generated-assets'
--   and (storage.foldername(name))[1] = 'organizations'
--   and ((storage.foldername(name))[2])::uuid = any(public.user_org_ids())
-- );
--
-- create policy "generated_assets_insert_own_org_path"
-- on storage.objects
-- for insert
-- to authenticated
-- with check (
--   bucket_id = 'generated-assets'
--   and (storage.foldername(name))[1] = 'organizations'
--   and ((storage.foldername(name))[2])::uuid = any(public.user_org_ids())
-- );
--
-- create policy "generated_assets_update_own_org_path"
-- on storage.objects
-- for update
-- to authenticated
-- using (
--   bucket_id = 'generated-assets'
--   and (storage.foldername(name))[1] = 'organizations'
--   and ((storage.foldername(name))[2])::uuid = any(public.user_org_ids())
-- )
-- with check (
--   bucket_id = 'generated-assets'
--   and (storage.foldername(name))[1] = 'organizations'
--   and ((storage.foldername(name))[2])::uuid = any(public.user_org_ids())
-- );
--
-- create policy "generated_assets_delete_own_org_path"
-- on storage.objects
-- for delete
-- to authenticated
-- using (
--   bucket_id = 'generated-assets'
--   and (storage.foldername(name))[1] = 'organizations'
--   and ((storage.foldername(name))[2])::uuid = any(public.user_org_ids())
-- );
