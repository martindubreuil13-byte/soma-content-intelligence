import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getCookieNames(cookiesToLog: { name: string }[]) {
  return cookiesToLog.map((cookie) => cookie.name);
}

export async function updateSession(request: NextRequest) {
    pathname: request.nextUrl.pathname,
    cookieCount: request.cookies.getAll().length,
    cookieNames: getCookieNames(request.cookies.getAll()),
  });

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const allCookies = request.cookies.getAll();
            pathname: request.nextUrl.pathname,
            count: allCookies.length,
            names: getCookieNames(allCookies),
          });
          return allCookies;
        },
        setAll(cookiesToSet) {
          console.log("SUPABASE SESSION COOKIES SET", {
            pathname: request.nextUrl.pathname,
            count: cookiesToSet.length,
            names: getCookieNames(cookiesToSet),
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("SUPABASE SESSION USER ERROR", {
      pathname: request.nextUrl.pathname,
      error,
    });
  }

    pathname: request.nextUrl.pathname,
    hasUser: Boolean(user),
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
  });

  return supabaseResponse;
}
