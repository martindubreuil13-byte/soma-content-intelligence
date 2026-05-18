-- Phase 10: output + storage decoupling foundation.
-- This migration keeps the Python/local outputs mirror intact while introducing
-- organization-scoped DB records for parsed snapshots and generated assets.

alter table public.generation_runs
  add column if not exists queued_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

create table if not exists public.generation_output_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generation_run_id uuid references public.generation_runs(id) on delete cascade,
  generation_channel_id uuid references public.generation_channels(id) on delete cascade,
  snapshot_type text not null,
  content jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.generation_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generation_run_id uuid references public.generation_runs(id) on delete cascade,
  generation_channel_id uuid references public.generation_channels(id) on delete cascade,
  artifact_id uuid references public.generation_artifacts(id) on delete set null,
  asset_type text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.generation_output_snapshots enable row level security;
alter table public.generation_assets enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.generation_output_snapshots to authenticated;
grant select, insert, update, delete on public.generation_assets to authenticated;

drop policy if exists "generation_output_snapshots_select_own_org" on public.generation_output_snapshots;
create policy "generation_output_snapshots_select_own_org"
on public.generation_output_snapshots
for select
to authenticated
using (organization_id = any(public.user_org_ids()));

drop policy if exists "generation_output_snapshots_insert_own_org" on public.generation_output_snapshots;
create policy "generation_output_snapshots_insert_own_org"
on public.generation_output_snapshots
for insert
to authenticated
with check (organization_id = any(public.user_org_ids()));

drop policy if exists "generation_output_snapshots_update_own_org" on public.generation_output_snapshots;
create policy "generation_output_snapshots_update_own_org"
on public.generation_output_snapshots
for update
to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

drop policy if exists "generation_output_snapshots_delete_own_org" on public.generation_output_snapshots;
create policy "generation_output_snapshots_delete_own_org"
on public.generation_output_snapshots
for delete
to authenticated
using (organization_id = any(public.user_org_ids()));

drop policy if exists "generation_assets_select_own_org" on public.generation_assets;
create policy "generation_assets_select_own_org"
on public.generation_assets
for select
to authenticated
using (organization_id = any(public.user_org_ids()));

drop policy if exists "generation_assets_insert_own_org" on public.generation_assets;
create policy "generation_assets_insert_own_org"
on public.generation_assets
for insert
to authenticated
with check (organization_id = any(public.user_org_ids()));

drop policy if exists "generation_assets_update_own_org" on public.generation_assets;
create policy "generation_assets_update_own_org"
on public.generation_assets
for update
to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

drop policy if exists "generation_assets_delete_own_org" on public.generation_assets;
create policy "generation_assets_delete_own_org"
on public.generation_assets
for delete
to authenticated
using (organization_id = any(public.user_org_ids()));

create index if not exists generation_runs_status_idx on public.generation_runs(status);
create index if not exists generation_runs_queued_at_idx on public.generation_runs(queued_at);
create index if not exists generation_runs_started_at_idx on public.generation_runs(started_at);
create index if not exists generation_runs_completed_at_idx on public.generation_runs(completed_at);

create index if not exists generation_output_snapshots_org_idx on public.generation_output_snapshots(organization_id);
create index if not exists generation_output_snapshots_run_idx on public.generation_output_snapshots(generation_run_id);
create index if not exists generation_output_snapshots_channel_idx on public.generation_output_snapshots(generation_channel_id);
create index if not exists generation_output_snapshots_type_idx on public.generation_output_snapshots(snapshot_type);
create index if not exists generation_output_snapshots_created_at_idx on public.generation_output_snapshots(created_at);

create index if not exists generation_assets_org_idx on public.generation_assets(organization_id);
create index if not exists generation_assets_run_idx on public.generation_assets(generation_run_id);
create index if not exists generation_assets_channel_idx on public.generation_assets(generation_channel_id);
create index if not exists generation_assets_artifact_idx on public.generation_assets(artifact_id);
create index if not exists generation_assets_type_idx on public.generation_assets(asset_type);
create index if not exists generation_assets_storage_path_idx on public.generation_assets(storage_path);
create index if not exists generation_assets_created_at_idx on public.generation_assets(created_at);

-- Storage bucket setup is intentionally not automatic.
-- Create a private Supabase Storage bucket named "generated-assets".
-- Store objects at:
--   organizations/{organization_id}/runs/{generation_run_id}/{channel}/{filename}
--
-- Recommended storage.objects policies, adjusted to your environment:
--
-- create policy "generated_assets_read_own_org"
-- on storage.objects
-- for select
-- to authenticated
-- using (
--   bucket_id = 'generated-assets'
--   and split_part(name, '/', 2)::uuid = any(public.user_org_ids())
-- );
--
-- create policy "generated_assets_insert_own_org"
-- on storage.objects
-- for insert
-- to authenticated
-- with check (
--   bucket_id = 'generated-assets'
--   and split_part(name, '/', 2)::uuid = any(public.user_org_ids())
-- );
--
-- create policy "generated_assets_update_own_org"
-- on storage.objects
-- for update
-- to authenticated
-- using (
--   bucket_id = 'generated-assets'
--   and split_part(name, '/', 2)::uuid = any(public.user_org_ids())
-- )
-- with check (
--   bucket_id = 'generated-assets'
--   and split_part(name, '/', 2)::uuid = any(public.user_org_ids())
-- );
--
-- create policy "generated_assets_delete_own_org"
-- on storage.objects
-- for delete
-- to authenticated
-- using (
--   bucket_id = 'generated-assets'
--   and split_part(name, '/', 2)::uuid = any(public.user_org_ids())
-- );
