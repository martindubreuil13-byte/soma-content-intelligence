"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AppGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem("soma-auth")) {
      router.replace("/");
    }
  }, [router]);

  return <>{children}</>;
}
