import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getCookieNames(cookiesToLog: { name: string }[]) {
  return cookiesToLog.map((cookie) => cookie.name);
}

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll();
            count: allCookies.length,
            names: getCookieNames(allCookies),
          });
          return allCookies;
        },
        setAll(cookiesToSet) {
          try {
            console.log("SERVER SUPABASE COOKIES SET", {
              count: cookiesToSet.length,
              names: getCookieNames(cookiesToSet),
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — cookie writes are a no-op here
          }
        },
      },
    }
  );
}
