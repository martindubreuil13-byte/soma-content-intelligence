import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <div className="mx-auto flex w-full max-w-md justify-center">
      <AuthForm mode="signup" />
    </div>
  );
}
