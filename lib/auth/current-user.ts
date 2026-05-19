import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[auth] user lookup failed", error.message);
    return null;
  }

  return user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    console.warn("[auth] redirecting unauthenticated request to /login");
    redirect("/login");
  }

  return user;
}
