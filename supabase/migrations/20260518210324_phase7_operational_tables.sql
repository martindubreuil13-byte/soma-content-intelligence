-- =====================================================
-- PHASE 7 OPERATIONAL TABLES
-- =====================================================

create or replace function public.user_org_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(om.organization_id), '{}'::uuid[])
  from public.organization_members om
  where om.user_id = auth.uid();
$$;

grant execute on function public.user_org_ids()
to authenticated;

-- =====================================================
-- TABLES
-- =====================================================

create table public.publishing_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,

  run_id text not null,
  channel text not null,
  status text not null,
  caption text,
  image_url text,
  scheduled_for timestamptz,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, run_id, channel)
);

create table public.training_injections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,

  label text not null,
  type text not null,
  applies_to text not null,
  source_type text,
  raw_content text,
  extracted_tags jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,

  name text not null,
  platform text not null,
  url text,
  active boolean not null default true,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_post_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,

  queue_item_id uuid references public.publishing_queue(id) on delete set null,
  group_target_id uuid references public.group_targets(id) on delete set null,
  status text,
  notes text,
  posted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schedule_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,

  enabled boolean not null default false,
  frequency text,
  timezone text,
  channels jsonb not null default '[]'::jsonb,
  config jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id)
);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

create trigger publishing_queue_updated_at
before update on public.publishing_queue
for each row
execute procedure public.handle_updated_at();

create trigger training_injections_updated_at
before update on public.training_injections
for each row
execute procedure public.handle_updated_at();

create trigger group_targets_updated_at
before update on public.group_targets
for each row
execute procedure public.handle_updated_at();

create trigger group_post_logs_updated_at
before update on public.group_post_logs
for each row
execute procedure public.handle_updated_at();

create trigger schedule_configs_updated_at
before update on public.schedule_configs
for each row
execute procedure public.handle_updated_at();

-- =====================================================
-- ENABLE RLS
-- =====================================================

alter table public.publishing_queue enable row level security;
alter table public.training_injections enable row level security;
alter table public.group_targets enable row level security;
alter table public.group_post_logs enable row level security;
alter table public.schedule_configs enable row level security;

-- =====================================================
-- GRANTS
-- RLS controls organization-scoped row access.
-- =====================================================

grant select, insert, update, delete on public.publishing_queue to authenticated;
grant select, insert, update, delete on public.training_injections to authenticated;
grant select, insert, update, delete on public.group_targets to authenticated;
grant select, insert, update, delete on public.group_post_logs to authenticated;
grant select, insert, update, delete on public.schedule_configs to authenticated;

-- =====================================================
-- POLICIES
-- =====================================================

create policy "Organization members can select publishing queue"
on public.publishing_queue
for select
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can insert publishing queue"
on public.publishing_queue
for insert
to authenticated
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can update publishing queue"
on public.publishing_queue
for update
to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can delete publishing queue"
on public.publishing_queue
for delete
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select training injections"
on public.training_injections
for select
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can insert training injections"
on public.training_injections
for insert
to authenticated
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can update training injections"
on public.training_injections
for update
to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can delete training injections"
on public.training_injections
for delete
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select group targets"
on public.group_targets
for select
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can insert group targets"
on public.group_targets
for insert
to authenticated
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can update group targets"
on public.group_targets
for update
to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can delete group targets"
on public.group_targets
for delete
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select group post logs"
on public.group_post_logs
for select
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can insert group post logs"
on public.group_post_logs
for insert
to authenticated
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can update group post logs"
on public.group_post_logs
for update
to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can delete group post logs"
on public.group_post_logs
for delete
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select schedule configs"
on public.schedule_configs
for select
to authenticated
using (organization_id = any(public.user_org_ids()));

create policy "Organization members can insert schedule configs"
on public.schedule_configs
for insert
to authenticated
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can update schedule configs"
on public.schedule_configs
for update
to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

create policy "Organization members can delete schedule configs"
on public.schedule_configs
for delete
to authenticated
using (organization_id = any(public.user_org_ids()));

-- =====================================================
-- INDEXES
-- =====================================================

create index idx_publishing_queue_org on public.publishing_queue(organization_id);
create index idx_publishing_queue_created_at on public.publishing_queue(created_at desc);
create index idx_publishing_queue_status on public.publishing_queue(status);
create index idx_publishing_queue_org_status on public.publishing_queue(organization_id, status);
create index idx_publishing_queue_org_run_channel on public.publishing_queue(organization_id, run_id, channel);
create index idx_publishing_queue_scheduled_for on public.publishing_queue(scheduled_for);

create index idx_training_injections_org on public.training_injections(organization_id);
create index idx_training_injections_created_at on public.training_injections(created_at desc);
create index idx_training_injections_active on public.training_injections(is_active);
create index idx_training_injections_org_active on public.training_injections(organization_id, is_active);
create index idx_training_injections_type on public.training_injections(type);
create index idx_training_injections_applies_to on public.training_injections(applies_to);

create index idx_group_targets_org on public.group_targets(organization_id);
create index idx_group_targets_created_at on public.group_targets(created_at desc);
create index idx_group_targets_active on public.group_targets(active);
create index idx_group_targets_org_active on public.group_targets(organization_id, active);
create index idx_group_targets_platform on public.group_targets(platform);

create index idx_group_post_logs_org on public.group_post_logs(organization_id);
create index idx_group_post_logs_created_at on public.group_post_logs(created_at desc);
create index idx_group_post_logs_status on public.group_post_logs(status);
create index idx_group_post_logs_queue_item on public.group_post_logs(queue_item_id);
create index idx_group_post_logs_group_target on public.group_post_logs(group_target_id);
create index idx_group_post_logs_posted_at on public.group_post_logs(posted_at desc);

create index idx_schedule_configs_org on public.schedule_configs(organization_id);
create index idx_schedule_configs_created_at on public.schedule_configs(created_at desc);
create index idx_schedule_configs_enabled on public.schedule_configs(enabled);
