import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getCurrentOrganizationForUserId } from "@/lib/auth/current-organization";

export default async function OnboardingPage() {
  const user = await requireCurrentUser();
  const organization = await getCurrentOrganizationForUserId(user.id);

  if (organization) {
    redirect("/app");
  }

  return (
    <div className="mx-auto max-w-lg rounded-[28px] border border-white/[0.08] bg-white/[0.045] p-8 text-center shadow-2xl shadow-black/30 backdrop-blur-2xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-peach/55">
        Workspace setup
      </p>
      <h1 className="mt-3 font-display text-3xl text-white">
        Your workspace is being prepared
      </h1>
      <p className="mt-3 text-sm leading-6 text-white/50">
        SOMA could not find an organization for this account yet. Sign out and sign back in once provisioning finishes, or check the Supabase trigger and RLS logs.
      </p>
    </div>
  );
}
