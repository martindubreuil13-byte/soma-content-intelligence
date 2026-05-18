-- =====================================================
-- PHASE 8 GENERATION PERSISTENCE
-- =====================================================

-- =====================================================
-- TABLES
-- =====================================================

create table public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,

  legacy_run_id text unique,
  title text,
  raw_idea text,
  status text not null default 'draft',
  source text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.generation_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.generation_runs(id) on delete cascade,

  channel text not null,
  status text not null default 'draft',
  caption text,
  visual_prompt text,
  image_url text,
  image_storage_path text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (run_id, channel)
);

create table public.generation_artifacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.generation_runs(id) on delete cascade,
  channel_id uuid references public.generation_channels(id) on delete cascade,

  artifact_type text not null,
  version integer not null default 1,
  content text,
  storage_path text,
  public_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,

  created_at timestamptz not null default now()
);

create table public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid references public.generation_runs(id) on delete cascade,
  channel_id uuid references public.generation_channels(id) on delete cascade,
  artifact_id uuid references public.generation_artifacts(id) on delete set null,

  target_type text not null,
  feedback_type text not null,
  status text,
  notes text,
  tags jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,

  created_at timestamptz not null default now()
);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

create trigger generation_runs_updated_at
before update on public.generation_runs
for each row
execute procedure public.handle_updated_at();

create trigger generation_channels_updated_at
before update on public.generation_channels
for each row
execute procedure public.handle_updated_at();

-- =====================================================
-- ENABLE RLS
-- =====================================================

alter table public.generation_runs enable row level security;
alter table public.generation_channels enable row level security;
alter table public.generation_artifacts enable row level security;
alter table public.feedback_events enable row level security;

-- =====================================================
-- GRANTS
-- RLS controls organization-scoped row access.
-- =====================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.generation_runs to authenticated;
grant select, insert, update, delete on public.generation_channels to authenticated;
grant select, insert, update, delete on public.generation_artifacts to authenticated;
grant select, insert, update, delete on public.feedback_events to authenticated;

-- =====================================================
-- POLICIES
-- =====================================================

create policy "Organization members can select generation runs"
on public.generation_runs
for select
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can insert generation runs"
on public.generation_runs
for insert
to authenticated
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can update generation runs"
on public.generation_runs
for update
to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can delete generation runs"
on public.generation_runs
for delete
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select generation channels"
on public.generation_channels
for select
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can insert generation channels"
on public.generation_channels
for insert
to authenticated
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can update generation channels"
on public.generation_channels
for update
to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can delete generation channels"
on public.generation_channels
for delete
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select generation artifacts"
on public.generation_artifacts
for select
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can insert generation artifacts"
on public.generation_artifacts
for insert
to authenticated
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can update generation artifacts"
on public.generation_artifacts
for update
to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can delete generation artifacts"
on public.generation_artifacts
for delete
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select feedback events"
on public.feedback_events
for select
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can insert feedback events"
on public.feedback_events
for insert
to authenticated
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can update feedback events"
on public.feedback_events
for update
to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can delete feedback events"
on public.feedback_events
for delete
to authenticated
using (organization_id = any(public.user_org_ids()));

-- =====================================================
-- INDEXES
-- =====================================================

create index idx_generation_runs_org on public.generation_runs(organization_id);
create index idx_generation_runs_legacy_run_id on public.generation_runs(legacy_run_id);
create index idx_generation_runs_status on public.generation_runs(status);
create index idx_generation_runs_created_at on public.generation_runs(created_at desc);

create index idx_generation_channels_org on public.generation_channels(organization_id);
create index idx_generation_channels_run_id on public.generation_channels(run_id);
create index idx_generation_channels_status on public.generation_channels(status);
create index idx_generation_channels_channel on public.generation_channels(channel);
create index idx_generation_channels_created_at on public.generation_channels(created_at desc);

create index idx_generation_artifacts_org on public.generation_artifacts(organization_id);
create index idx_generation_artifacts_run_id on public.generation_artifacts(run_id);
create index idx_generation_artifacts_channel_id on public.generation_artifacts(channel_id);
create index idx_generation_artifacts_artifact_type on public.generation_artifacts(artifact_type);
create index idx_generation_artifacts_created_at on public.generation_artifacts(created_at desc);

create index idx_feedback_events_org on public.feedback_events(organization_id);
create index idx_feedback_events_run_id on public.feedback_events(run_id);
create index idx_feedback_events_channel_id on public.feedback_events(channel_id);
create index idx_feedback_events_artifact_id on public.feedback_events(artifact_id);
create index idx_feedback_events_status on public.feedback_events(status);
create index idx_feedback_events_target_type on public.feedback_events(target_type);
create index idx_feedback_events_created_at on public.feedback_events(created_at desc);

-- =====================================================
-- STORAGE FOUNDATION NOTES
-- =====================================================

-- Bucket: generated-images
-- Recommended setup for Phase 8B:
-- 1. Create a private Supabase Storage bucket named "generated-images".
-- 2. Store generated images at:
--    organizations/{organization_id}/runs/{run_id}/{channel}/{artifact_id}.png
-- 3. Add storage.objects RLS policies that permit authenticated users to
--    select/insert/update/delete only objects whose path organization_id is
--    included in public.user_org_ids().
-- 4. Do not make this bucket public until signed URL or explicit access policy
--    behavior is intentionally designed.
