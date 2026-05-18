import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-md justify-center">
      <AuthForm mode="signin" />
    </div>
  );
}
