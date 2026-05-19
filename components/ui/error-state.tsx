type ErrorStateProps = {
  title?: string;
  message?: string;
};

export function ErrorState({ title = "Something needs attention", message = "Try again in a moment." }: ErrorStateProps) {
  return (
    <div className="rounded-3xl border border-plasma/20 bg-plasma/[0.06] p-6 text-center">
      <p className="font-display text-2xl text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">{message}</p>
    </div>
  );
}
