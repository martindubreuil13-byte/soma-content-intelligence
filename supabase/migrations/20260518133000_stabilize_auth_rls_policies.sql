-- =====================================================
-- STABILIZE AUTH RLS POLICIES
-- =====================================================

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- =====================================================
-- DROP EXISTING POLICIES
-- =====================================================

drop policy if exists "Users can view own profile"
on public.profiles;

drop policy if exists "Users can update own profile"
on public.profiles;

drop policy if exists "Members can view organizations"
on public.organizations;

drop policy if exists "Members can view memberships"
on public.organization_members;

drop policy if exists "Users can view own memberships"
on public.organization_members;

-- =====================================================
-- GRANTS
-- RLS still controls which rows authenticated users can access.
-- =====================================================

grant usage on schema public to authenticated;

grant select on public.profiles
to authenticated;

grant update on public.profiles
to authenticated;

grant select on public.organizations
to authenticated;

grant select on public.organization_members
to authenticated;

-- =====================================================
-- PROFILES
-- Users can only view/update their own profile.
-- =====================================================

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- =====================================================
-- ORGANIZATION MEMBERS
-- Users can only view their own memberships.
-- =====================================================

create policy "Users can view own memberships"
on public.organization_members
for select
to authenticated
using (auth.uid() = user_id);

-- =====================================================
-- ORGANIZATIONS
-- Users can only view organizations where they are members.
-- This depends on the non-recursive own-memberships policy above.
-- =====================================================

create policy "Members can view organizations"
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organizations.id
    and om.user_id = auth.uid()
  )
);
