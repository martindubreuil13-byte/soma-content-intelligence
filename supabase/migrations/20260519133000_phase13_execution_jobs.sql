-- Phase 13: durable execution jobs and execution event audit trail.

create table if not exists public.execution_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generation_run_id uuid references public.generation_runs(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  priority integer default 100,
  retry_count integer default 0,
  max_retries integer default 3,
  scheduled_for timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  locked_at timestamptz,
  worker_id text,
  error_message text,
  payload jsonb default '{}'::jsonb,
  result jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.execution_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  execution_job_id uuid not null references public.execution_jobs(id) on delete cascade,
  event_type text not null,
  message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.execution_jobs enable row level security;
alter table public.execution_events enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.execution_jobs to authenticated;
grant select, insert, update, delete on public.execution_events to authenticated;

drop policy if exists "execution_jobs_select_own_org" on public.execution_jobs;
create policy "execution_jobs_select_own_org" on public.execution_jobs
for select to authenticated using (organization_id = any(public.user_org_ids()));

drop policy if exists "execution_jobs_insert_own_org" on public.execution_jobs;
create policy "execution_jobs_insert_own_org" on public.execution_jobs
for insert to authenticated with check (organization_id = any(public.user_org_ids()));

drop policy if exists "execution_jobs_update_own_org" on public.execution_jobs;
create policy "execution_jobs_update_own_org" on public.execution_jobs
for update to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

drop policy if exists "execution_jobs_delete_own_org" on public.execution_jobs;
create policy "execution_jobs_delete_own_org" on public.execution_jobs
for delete to authenticated using (organization_id = any(public.user_org_ids()));

drop policy if exists "execution_events_select_own_org" on public.execution_events;
create policy "execution_events_select_own_org" on public.execution_events
for select to authenticated using (organization_id = any(public.user_org_ids()));

drop policy if exists "execution_events_insert_own_org" on public.execution_events;
create policy "execution_events_insert_own_org" on public.execution_events
for insert to authenticated with check (organization_id = any(public.user_org_ids()));

drop policy if exists "execution_events_update_own_org" on public.execution_events;
create policy "execution_events_update_own_org" on public.execution_events
for update to authenticated
using (organization_id = any(public.user_org_ids()))
with check (organization_id = any(public.user_org_ids()));

drop policy if exists "execution_events_delete_own_org" on public.execution_events;
create policy "execution_events_delete_own_org" on public.execution_events
for delete to authenticated using (organization_id = any(public.user_org_ids()));

create index if not exists execution_jobs_org_idx on public.execution_jobs(organization_id);
create index if not exists execution_jobs_status_idx on public.execution_jobs(status);
create index if not exists execution_jobs_scheduled_for_idx on public.execution_jobs(scheduled_for);
create index if not exists execution_jobs_priority_idx on public.execution_jobs(priority);
create index if not exists execution_jobs_created_at_idx on public.execution_jobs(created_at);
create index if not exists execution_jobs_generation_run_idx on public.execution_jobs(generation_run_id);
create index if not exists execution_jobs_worker_idx on public.execution_jobs(worker_id);
create index if not exists execution_jobs_locked_at_idx on public.execution_jobs(locked_at);

create index if not exists execution_events_org_idx on public.execution_events(organization_id);
create index if not exists execution_events_job_idx on public.execution_events(execution_job_id);
create index if not exists execution_events_type_idx on public.execution_events(event_type);
create index if not exists execution_events_created_at_idx on public.execution_events(created_at);
