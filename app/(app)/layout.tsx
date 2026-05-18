import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getCurrentOrganizationForUserId } from "@/lib/auth/current-organization";
import { createWorkspaceContext } from "@/lib/workspace/workspace-context";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCurrentUser();
  const organization = await getCurrentOrganizationForUserId(user.id);

  if (!organization) {
    console.warn("APP LAYOUT REDIRECT", {
      destination: "/onboarding",
      reason: "missing organization",
      userId: user.id,
    });
    redirect("/onboarding");
  }

  const context = createWorkspaceContext(user, organization);

  return (
    <div className="min-h-screen bg-charcoal text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(177,85,201,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,144,122,0.12),transparent_28%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px] opacity-35" />

      <AppSidebar context={context} />

      <div className="relative min-h-screen lg:pl-64">
        <AppHeader context={context} />
        <main className="pb-10">{children}</main>
      </div>
    </div>
  );
}
