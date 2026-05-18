import type { User } from "@supabase/supabase-js";
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
