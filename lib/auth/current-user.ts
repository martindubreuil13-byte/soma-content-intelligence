import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createServerSupabase();
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

    hasSession: Boolean(sessionData.session),
    sessionUserId: sessionData.session?.user.id ?? null,
    sessionUserEmail: sessionData.session?.user.email ?? null,
  });

  if (sessionError) {
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("CURRENT USER ERROR", error);
    return null;
  }

    hasUser: Boolean(user),
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
  });

  return user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    console.log("CURRENT USER REDIRECT", {
      destination: "/login",
      reason: "missing user",
    });
    redirect("/login");
  }

  return user;
}
