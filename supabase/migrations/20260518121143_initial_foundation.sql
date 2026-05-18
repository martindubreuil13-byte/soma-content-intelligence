-- =====================================================
-- EXTENSIONS
-- =====================================================

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================
-- PROFILES
-- =====================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  email text unique,
  full_name text,
  avatar_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
before update on public.profiles
for each row
execute procedure public.handle_updated_at();

-- =====================================================
-- ORGANIZATIONS
-- =====================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  slug text unique not null,

  created_by uuid references public.profiles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_updated_at
before update on public.organizations
for each row
execute procedure public.handle_updated_at();

-- =====================================================
-- ORGANIZATION MEMBERS
-- =====================================================

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,

  role text not null check (
    role in (
      'owner',
      'admin',
      'operator',
      'viewer'
    )
  ),

  created_at timestamptz not null default now(),

  unique (organization_id, user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

create index idx_org_members_org
on public.organization_members(organization_id);

create index idx_org_members_user
on public.organization_members(user_id);

create index idx_organizations_slug
on public.organizations(slug);

-- =====================================================
-- ENABLE RLS
-- =====================================================

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- =====================================================
-- PROFILE POLICIES
-- =====================================================

create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id);

-- =====================================================
-- ORGANIZATION POLICIES
-- =====================================================

create policy "Members can view organizations"
on public.organizations
for select
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organizations.id
    and om.user_id = auth.uid()
  )
);

-- =====================================================
-- ORGANIZATION MEMBER POLICIES
-- =====================================================

create policy "Members can view memberships"
on public.organization_members
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.organization_members om
    where om.organization_id = organization_members.organization_id
    and om.user_id = auth.uid()
  )
);