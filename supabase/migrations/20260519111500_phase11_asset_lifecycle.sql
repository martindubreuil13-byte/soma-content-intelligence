-- Phase 11 continuation: asset lifecycle and memory evolution.
-- Assets are versioned organizational memory. Storage objects are not physically
-- deleted during normal archive/delete operations.

alter table public.organization_assets
  add column if not exists replaced_by_asset_id uuid references public.organization_assets(id) on delete set null,
  add column if not exists previous_asset_id uuid references public.organization_assets(id) on delete set null,
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists ai_score numeric default 0,
  add column if not exists ai_usage_count integer default 0,
  add column if not exists recommended boolean default false,
  add column if not exists expires_at timestamptz,
  add column if not exists semantic_metadata jsonb default '{}'::jsonb;

create index if not exists organization_assets_replaced_by_idx on public.organization_assets(replaced_by_asset_id);
create index if not exists organization_assets_previous_idx on public.organization_assets(previous_asset_id);
create index if not exists organization_assets_archived_at_idx on public.organization_assets(archived_at);
create index if not exists organization_assets_deleted_at_idx on public.organization_assets(deleted_at);
create index if not exists organization_assets_recommended_idx on public.organization_assets(recommended);
create index if not exists organization_assets_expires_at_idx on public.organization_assets(expires_at);
