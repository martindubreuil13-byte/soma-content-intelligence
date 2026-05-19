-- Phase 12: durable feedback lineage and scheduler runtime state.

create table if not exists public.feedback_lineages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generation_run_id uuid not null references public.generation_runs(id) on delete cascade,
  channel text not null,
  current_caption_version_id uuid,
  current_visual_prompt_version_id uuid,
  current_image_version_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(generation_run_id, channel)
);

create table if not exists public.feedback_lineage_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  feedback_lineage_id uuid not null references public.feedback_lineages(id) on delete cascade,
  artifact_type text not null,
  generation_artifact_id uuid references public.generation_artifacts(id) on delete cascade,
  version_number integer not null,
  status text not null,
  tags jsonb default '[]'::jsonb,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(feedback_lineage_id, artifact_type, version_number)
);

create table if not exists public.scheduler_runtime_state (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scheduler_key text not null,
  is_running boolean default false,
  locked_until timestamptz,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_error text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, scheduler_key)
);

alter table public.feedback_lineages
  add constraint feedback_lineages_current_caption_fk
  foreign key (current_caption_version_id) references public.feedback_lineage_versions(id) on delete set null;

alter table public.feedback_lineages
  add constraint feedback_lineages_current_visual_prompt_fk
  foreign key (current_visual_prompt_version_id) references public.feedback_lineage_versions(id) on delete set null;

alter table public.feedback_lineages
  add constraint feedback_lineages_current_image_fk
  foreign key (current_image_version_id) references public.feedback_lineage_versions(id) on delete set null;

alter table public.feedback_lineages enable row level security;
alter table public.feedback_lineage_versions enable row level security;
alter table public.scheduler_runtime_state enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.feedback_lineages to authenticated;
grant select, insert, update, delete on public.feedback_lineage_versions to authenticated;
grant select, insert, update, delete on public.scheduler_runtime_state to authenticated;

drop policy if exists "feedback_lineages_select_own_org" on public.feedback_lineages;
create policy "feedback_lineages_select_own_org" on public.feedback_lineages
for select to authenticated using (organization_id = any(public.user_org_ids()));

drop policy if exists "feedback_lineages_insert_own_org" on public.feedback_lineages;
create policy "feedback_lineages_insert_own_org" on public.feedback_lineages
for insert to authenticated with check (organization_id = any(public.user_org_ids()));

drop policy if exists "feedback_lineages_update_own_org" on public.feedback_lineages;
create policy "feedback_lineages_update_own_org" on public.feedback_lineages
for update to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

drop policy if exists "feedback_lineages_delete_own_org" on public.feedback_lineages;
create policy "feedback_lineages_delete_own_org" on public.feedback_lineages
for delete to authenticated using (organization_id = any(public.user_org_ids()));

drop policy if exists "feedback_lineage_versions_select_own_org" on public.feedback_lineage_versions;
create policy "feedback_lineage_versions_select_own_org" on public.feedback_lineage_versions
for select to authenticated using (organization_id = any(public.user_org_ids()));

drop policy if exists "feedback_lineage_versions_insert_own_org" on public.feedback_lineage_versions;
create policy "feedback_lineage_versions_insert_own_org" on public.feedback_lineage_versions
for insert to authenticated with check (organization_id = any(public.user_org_ids()));

drop policy if exists "feedback_lineage_versions_update_own_org" on public.feedback_lineage_versions;
create policy "feedback_lineage_versions_update_own_org" on public.feedback_lineage_versions
for update to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

drop policy if exists "feedback_lineage_versions_delete_own_org" on public.feedback_lineage_versions;
create policy "feedback_lineage_versions_delete_own_org" on public.feedback_lineage_versions
for delete to authenticated using (organization_id = any(public.user_org_ids()));

drop policy if exists "scheduler_runtime_select_own_org" on public.scheduler_runtime_state;
create policy "scheduler_runtime_select_own_org" on public.scheduler_runtime_state
for select to authenticated using (organization_id = any(public.user_org_ids()));

drop policy if exists "scheduler_runtime_insert_own_org" on public.scheduler_runtime_state;
create policy "scheduler_runtime_insert_own_org" on public.scheduler_runtime_state
for insert to authenticated with check (organization_id = any(public.user_org_ids()));

drop policy if exists "scheduler_runtime_update_own_org" on public.scheduler_runtime_state;
create policy "scheduler_runtime_update_own_org" on public.scheduler_runtime_state
for update to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

drop policy if exists "scheduler_runtime_delete_own_org" on public.scheduler_runtime_state;
create policy "scheduler_runtime_delete_own_org" on public.scheduler_runtime_state
for delete to authenticated using (organization_id = any(public.user_org_ids()));

create index if not exists feedback_lineages_org_idx on public.feedback_lineages(organization_id);
create index if not exists feedback_lineages_run_idx on public.feedback_lineages(generation_run_id);
create index if not exists feedback_lineages_channel_idx on public.feedback_lineages(channel);
create index if not exists feedback_lineages_updated_at_idx on public.feedback_lineages(updated_at);

create index if not exists feedback_lineage_versions_org_idx on public.feedback_lineage_versions(organization_id);
create index if not exists feedback_lineage_versions_lineage_idx on public.feedback_lineage_versions(feedback_lineage_id);
create index if not exists feedback_lineage_versions_artifact_type_idx on public.feedback_lineage_versions(artifact_type);
create index if not exists feedback_lineage_versions_status_idx on public.feedback_lineage_versions(status);
create index if not exists feedback_lineage_versions_created_at_idx on public.feedback_lineage_versions(created_at);

create index if not exists scheduler_runtime_org_idx on public.scheduler_runtime_state(organization_id);
create index if not exists scheduler_runtime_key_idx on public.scheduler_runtime_state(scheduler_key);
create index if not exists scheduler_runtime_locked_until_idx on public.scheduler_runtime_state(locked_until);
create index if not exists scheduler_runtime_running_idx on public.scheduler_runtime_state(is_running);
