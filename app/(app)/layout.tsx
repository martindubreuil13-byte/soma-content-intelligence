import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getCurrentOrganizationForUserId } from "@/lib/auth/current-organization";
import { createWorkspaceContext } from "@/lib/workspace/workspace-context";
import { getAgentTrainingSummary } from "@/lib/agent-training";
import { getContentRuns } from "@/lib/output-runs";

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

  let agentScore = 0;
  try {
    const runs = await getContentRuns();
    const summary = await getAgentTrainingSummary(runs);
    agentScore = summary.score;
  } catch {
    // Score stays at 0 if unavailable
  }

  return (
    <div className="min-h-screen text-soma-parchment" style={{ background: "#0C0910" }}>
      {/* Ambient background gradients */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 45% at 18% 0%, rgba(80,28,110,0.35) 0%, transparent 100%), radial-gradient(ellipse 50% 35% at 84% 5%, rgba(168,113,138,0.18) 0%, transparent 100%)",
        }}
      />
      {/* Subtle grid */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />

      <AppSidebar context={context} agentScore={agentScore} />

      <div className="relative min-h-screen lg:pl-64">
        <AppHeader context={context} />
        <main className="pb-12">{children}</main>
      </div>
    </div>
  );
}
