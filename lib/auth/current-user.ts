import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("CURRENT USER ERROR", error);
    return null;
  }

  return user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    console.warn("CURRENT USER REDIRECT");
    redirect("/login");
  }

  return user;
}
