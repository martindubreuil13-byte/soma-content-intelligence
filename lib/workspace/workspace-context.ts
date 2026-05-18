import type { User } from "@supabase/supabase-js";
import { getCurrentOrganizationForUserId } from "@/lib/auth/current-organization";
import { getCurrentUser } from "@/lib/auth/current-user";
import type {
  CurrentOrganization,
  OrganizationRole,
} from "@/lib/auth/current-organization";

export type AppWorkspaceContext = {
  user: {
    id: string;
    email: string | null;
    avatarUrl: string | null;
  };
  organization: CurrentOrganization;
  role: OrganizationRole;
};

export function createWorkspaceContext(
  user: User,
  organization: CurrentOrganization
): AppWorkspaceContext {
  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
    },
    organization,
    role: organization.role,
  };
}

export async function getCurrentWorkspaceContext(): Promise<AppWorkspaceContext | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const organization = await getCurrentOrganizationForUserId(user.id);

  if (!organization) {
    return null;
  }

  return createWorkspaceContext(user, organization);
}

export async function requireWorkspaceContext(): Promise<AppWorkspaceContext> {
  const context = await getCurrentWorkspaceContext();

  if (!context) {
    throw new Error("Authenticated workspace context is required.");
  }

  return context;
}
