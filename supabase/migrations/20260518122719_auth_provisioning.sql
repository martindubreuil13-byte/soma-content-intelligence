-- =====================================================
-- AUTO PROFILE + ORGANIZATION PROVISIONING
-- =====================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  workspace_name text;
  workspace_slug text;
begin

  -- ==========================================
  -- CREATE PROFILE
  -- ==========================================

  insert into public.profiles (
    id,
    email,
    full_name
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    )
  );

  -- ==========================================
  -- CREATE PERSONAL ORGANIZATION
  -- ==========================================

  workspace_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  ) || ' Workspace';

  workspace_slug := lower(
    regexp_replace(
      workspace_name,
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    )
  ) || '-' || substring(new.id::text from 1 for 8);

  insert into public.organizations (
    name,
    slug,
    created_by
  )
  values (
    workspace_name,
    workspace_slug,
    new.id
  )
  returning id into new_org_id;

  -- ==========================================
  -- CREATE OWNER MEMBERSHIP
  -- ==========================================

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    new_org_id,
    new.id,
    'owner'
  );

  return new;
end;
$$;

-- =====================================================
-- AUTH TRIGGER
-- =====================================================

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();