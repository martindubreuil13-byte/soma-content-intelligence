import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-charcoal px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(177,85,201,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(200,144,122,0.14),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />

      <Link href="/" className="absolute left-6 top-6 z-10">
        <Image
          src="/logos/soma-logo-white.png"
          alt="SOMA by MINDRA"
          width={1536}
          height={1024}
          priority
          className="h-auto w-[112px] opacity-90"
        />
      </Link>

      <div className="relative z-10 w-full">{children}</div>
    </main>
  );
}
