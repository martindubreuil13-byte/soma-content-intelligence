type EmptyStateProps = {
  title?: string;
  message?: string;
};

export function EmptyState({ title = "Nothing here yet", message = "New items will appear here when they are ready." }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-white/[0.12] bg-white/[0.035] p-10 text-center">
      <p className="font-display text-2xl text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/52">{message}</p>
    </div>
  );
}
