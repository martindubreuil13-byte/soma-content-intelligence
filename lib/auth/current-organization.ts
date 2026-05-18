import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabase } from "@/lib/supabase/server";

export type OrganizationRole = "owner" | "admin" | "operator" | "viewer";

export type CurrentOrganization = {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRole;
};

type OrganizationMemberRow = {
  organization_id: string;
  role: OrganizationRole;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
};

async function getOrganizationForUserId(
  userId: string
): Promise<CurrentOrganization | null> {

  const supabase = await createServerSupabase();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<OrganizationMemberRow>();


  if (membershipError) {
    console.error("ORG MEMBERSHIP ERROR", membershipError);
    return null;
  }

  if (!membership) {
    console.log("ORG MEMBERSHIP MISSING", { userId });
    return null;
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", membership.organization_id)
    .maybeSingle<OrganizationRow>();


  if (organizationError) {
    console.error("ORG FETCH ERROR", organizationError);
    return null;
  }

  if (!organization) {
    console.log("ORG FETCH MISSING", {
      organizationId: membership.organization_id,
      userId,
    });
    return null;
  }

  const currentOrganization = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    role: membership.role,
  };


  return currentOrganization;
}

export async function getCurrentOrganization(): Promise<CurrentOrganization | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return getOrganizationForUserId(user.id);
}

export async function requireCurrentOrganization() {
  const user = await getCurrentUser();

  if (!user) {
    console.log("ORG REDIRECT CONDITION", {
      destination: "/login",
      reason: "missing user",
    });
    redirect("/login");
  }

  const organization = await getOrganizationForUserId(user.id);

  if (!organization) {
    console.log("ORG REDIRECT CONDITION", {
      destination: "/onboarding",
      reason: "missing organization",
      userId: user.id,
    });
    redirect("/onboarding");
  }

  return organization;
}
