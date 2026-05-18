import { getCurrentOrganization } from "@/lib/auth/current-organization";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DebugAuthPage() {
  const user = await getCurrentUser();
  const organization = await getCurrentOrganization();

  if (!user) {
    return (
      <main className="min-h-screen p-6 text-white">
        <h1 className="text-xl font-semibold">Debug auth</h1>
        <p className="mt-4 text-white/70">Not authenticated</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 text-white">
      <h1 className="text-xl font-semibold">Debug auth</h1>
      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="text-white/45">User email</dt>
          <dd>{user.email ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="text-white/45">User id</dt>
          <dd>{user.id}</dd>
        </div>
        <div>
          <dt className="text-white/45">Organization name</dt>
          <dd>{organization?.name ?? "None"}</dd>
        </div>
        <div>
          <dt className="text-white/45">Organization id</dt>
          <dd>{organization?.id ?? "None"}</dd>
        </div>
        <div>
          <dt className="text-white/45">Role</dt>
          <dd>{organization?.role ?? "None"}</dd>
        </div>
      </dl>
    </main>
  );
}
