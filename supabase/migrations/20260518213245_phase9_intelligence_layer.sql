-- =====================================================
-- PHASE 9 INTELLIGENCE LAYER
-- =====================================================

create table public.brand_cores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission text,
  positioning text,
  voice text,
  audience text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table public.brand_icps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  description text,
  pains jsonb not null default '[]'::jsonb,
  desires jsonb not null default '[]'::jsonb,
  triggers jsonb not null default '[]'::jsonb,
  channels jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brand_angles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  description text,
  emotional_weight integer not null default 0,
  channels jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.brand_hook_styles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  description text,
  examples jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.brand_cta_styles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  description text,
  examples jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.brand_constraints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text,
  label text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.learning_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid references public.generation_runs(id) on delete set null,
  artifact_id uuid references public.generation_artifacts(id) on delete set null,
  event_type text not null,
  channel text,
  target_type text,
  status text,
  tags jsonb not null default '[]'::jsonb,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.preference_memories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  weight numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (organization_id, category, key)
);

create trigger brand_cores_updated_at
before update on public.brand_cores
for each row
execute procedure public.handle_updated_at();

create trigger brand_icps_updated_at
before update on public.brand_icps
for each row
execute procedure public.handle_updated_at();

alter table public.brand_cores enable row level security;
alter table public.brand_icps enable row level security;
alter table public.brand_angles enable row level security;
alter table public.brand_hook_styles enable row level security;
alter table public.brand_cta_styles enable row level security;
alter table public.brand_constraints enable row level security;
alter table public.learning_events enable row level security;
alter table public.preference_memories enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.brand_cores to authenticated;
grant select, insert, update, delete on public.brand_icps to authenticated;
grant select, insert, update, delete on public.brand_angles to authenticated;
grant select, insert, update, delete on public.brand_hook_styles to authenticated;
grant select, insert, update, delete on public.brand_cta_styles to authenticated;
grant select, insert, update, delete on public.brand_constraints to authenticated;
grant select, insert, update, delete on public.learning_events to authenticated;
grant select, insert, update, delete on public.preference_memories to authenticated;

create policy "Organization members can select brand cores" on public.brand_cores for select to authenticated using (organization_id = any(public.user_org_ids()));
create policy "Organization members can insert brand cores" on public.brand_cores for insert to authenticated with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can update brand cores" on public.brand_cores for update to authenticated using (organization_id = any(public.user_org_ids())) with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can delete brand cores" on public.brand_cores for delete to authenticated using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select brand icps" on public.brand_icps for select to authenticated using (organization_id = any(public.user_org_ids()));
create policy "Organization members can insert brand icps" on public.brand_icps for insert to authenticated with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can update brand icps" on public.brand_icps for update to authenticated using (organization_id = any(public.user_org_ids())) with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can delete brand icps" on public.brand_icps for delete to authenticated using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select brand angles" on public.brand_angles for select to authenticated using (organization_id = any(public.user_org_ids()));
create policy "Organization members can insert brand angles" on public.brand_angles for insert to authenticated with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can update brand angles" on public.brand_angles for update to authenticated using (organization_id = any(public.user_org_ids())) with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can delete brand angles" on public.brand_angles for delete to authenticated using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select brand hook styles" on public.brand_hook_styles for select to authenticated using (organization_id = any(public.user_org_ids()));
create policy "Organization members can insert brand hook styles" on public.brand_hook_styles for insert to authenticated with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can update brand hook styles" on public.brand_hook_styles for update to authenticated using (organization_id = any(public.user_org_ids())) with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can delete brand hook styles" on public.brand_hook_styles for delete to authenticated using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select brand cta styles" on public.brand_cta_styles for select to authenticated using (organization_id = any(public.user_org_ids()));
create policy "Organization members can insert brand cta styles" on public.brand_cta_styles for insert to authenticated with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can update brand cta styles" on public.brand_cta_styles for update to authenticated using (organization_id = any(public.user_org_ids())) with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can delete brand cta styles" on public.brand_cta_styles for delete to authenticated using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select brand constraints" on public.brand_constraints for select to authenticated using (organization_id = any(public.user_org_ids()));
create policy "Organization members can insert brand constraints" on public.brand_constraints for insert to authenticated with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can update brand constraints" on public.brand_constraints for update to authenticated using (organization_id = any(public.user_org_ids())) with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can delete brand constraints" on public.brand_constraints for delete to authenticated using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select learning events" on public.learning_events for select to authenticated using (organization_id = any(public.user_org_ids()));
create policy "Organization members can insert learning events" on public.learning_events for insert to authenticated with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can update learning events" on public.learning_events for update to authenticated using (organization_id = any(public.user_org_ids())) with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can delete learning events" on public.learning_events for delete to authenticated using (organization_id = any(public.user_org_ids()));

create policy "Organization members can select preference memories" on public.preference_memories for select to authenticated using (organization_id = any(public.user_org_ids()));
create policy "Organization members can insert preference memories" on public.preference_memories for insert to authenticated with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can update preference memories" on public.preference_memories for update to authenticated using (organization_id = any(public.user_org_ids())) with check (organization_id = any(public.user_org_ids()));
create policy "Organization members can delete preference memories" on public.preference_memories for delete to authenticated using (organization_id = any(public.user_org_ids()));

create index idx_brand_cores_org on public.brand_cores(organization_id);

create index idx_brand_icps_org on public.brand_icps(organization_id);
create index idx_brand_icps_created_at on public.brand_icps(created_at desc);
create index idx_brand_icps_label on public.brand_icps(label);

create index idx_brand_angles_org on public.brand_angles(organization_id);
create index idx_brand_angles_created_at on public.brand_angles(created_at desc);
create index idx_brand_angles_label on public.brand_angles(label);

create index idx_brand_hook_styles_org on public.brand_hook_styles(organization_id);
create index idx_brand_hook_styles_created_at on public.brand_hook_styles(created_at desc);
create index idx_brand_hook_styles_label on public.brand_hook_styles(label);

create index idx_brand_cta_styles_org on public.brand_cta_styles(organization_id);
create index idx_brand_cta_styles_created_at on public.brand_cta_styles(created_at desc);
create index idx_brand_cta_styles_label on public.brand_cta_styles(label);

create index idx_brand_constraints_org on public.brand_constraints(organization_id);
create index idx_brand_constraints_created_at on public.brand_constraints(created_at desc);
create index idx_brand_constraints_label on public.brand_constraints(label);
create index idx_brand_constraints_category on public.brand_constraints(category);

create index idx_learning_events_org on public.learning_events(organization_id);
create index idx_learning_events_created_at on public.learning_events(created_at desc);
create index idx_learning_events_event_type on public.learning_events(event_type);
create index idx_learning_events_status on public.learning_events(status);
create index idx_learning_events_channel on public.learning_events(channel);

create index idx_preference_memories_org on public.preference_memories(organization_id);
create index idx_preference_memories_category on public.preference_memories(category);
create index idx_preference_memories_key on public.preference_memories(key);
create index idx_preference_memories_updated_at on public.preference_memories(updated_at desc);
