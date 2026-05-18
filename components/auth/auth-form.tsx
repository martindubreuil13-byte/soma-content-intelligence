"use client";

import type { AuthChangeEvent, Session, Subscription } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";
type BrowserSupabaseClient = ReturnType<typeof createClient>;

function waitForBrowserSession(supabase: BrowserSupabaseClient, timeoutMs = 5000) {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    let subscription: Subscription | undefined;
    let timeoutId: number | undefined;

    const finish = (hasSession: boolean) => {
      if (settled) return;
      settled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      subscription?.unsubscribe();
      resolve(hasSession);
    };

    const { data } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (session) {
          finish(true);
          return;
        }

        if (event === "SIGNED_OUT") {
          finish(false);
        }
      }
    );
    subscription = data.subscription;

    void supabase.auth
      .getSession()
      .then(({ data: sessionData }: { data: { session: Session | null } }) => {
        finish(Boolean(sessionData.session));
      });

    timeoutId = window.setTimeout(() => finish(false), timeoutMs);
  });
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg("");

    const supabase = createClient();
    const { data, error } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("AUTH FORM ERROR", error);
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setErrorMsg("Check your email to confirm your account before signing in.");
      setLoading(false);
      return;
    }

    const hasSession = await waitForBrowserSession(supabase);
    if (!hasSession) {
      setErrorMsg("Signed in, but the browser session was not ready. Please try again.");
      setLoading(false);
      return;
    }

    router.replace("/app");
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="w-full max-w-md rounded-[28px] border border-white/[0.08] bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-peach/55">
        {isSignup ? "Create workspace" : "Welcome back"}
      </p>
      <h1 className="mt-3 font-display text-3xl text-white">
        {isSignup ? "Start with SOMA" : "Sign in to SOMA"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-white/48">
        {isSignup
          ? "Your workspace is provisioned automatically after signup."
          : "Continue into your adaptive content workspace."}
      </p>

      <div className="mt-6 grid gap-3">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          autoComplete="email"
          disabled={loading}
          className="rounded-2xl border border-white/[0.09] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-peach/40"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          disabled={loading}
          className="rounded-2xl border border-white/[0.09] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-peach/40"
        />
      </div>

      {errorMsg ? (
        <p className="mt-4 rounded-2xl border border-plasma/20 bg-plasma/[0.08] px-4 py-3 text-sm text-peach">
          {errorMsg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-plasma/30 bg-plasma/[0.14] px-4 py-3 text-sm font-semibold text-peach transition hover:border-plasma/50 hover:bg-plasma/[0.2] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        {isSignup ? "Create account" : "Sign in"}
      </button>

      <p className="mt-5 text-center text-sm text-white/40">
        {isSignup ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-semibold text-peach/80 transition hover:text-white"
        >
          {isSignup ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </form>
  );
}
