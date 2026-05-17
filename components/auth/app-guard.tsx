"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AppGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "authenticated" | "redirecting">("checking");

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    function redirectHome() {
      if (!isMounted) return;
      setStatus("redirecting");
      router.replace("/");
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!isMounted) return;

      if (session) {
        setStatus("authenticated");
        return;
      }

      if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
        redirectHome();
      }
    });

    const fallback = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
        const { session } = data;
        if (!isMounted) return;
        if (session) {
          setStatus("authenticated");
          return;
        }

        router.replace("/");
      });
    }, 1500);

    return () => {
      isMounted = false;
      window.clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, [router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-charcoal text-white/60">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Loader2 size={18} className="animate-spin text-peach" />
          {status === "redirecting" ? "Redirecting..." : "Restoring session..."}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
