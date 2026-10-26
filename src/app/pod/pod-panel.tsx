/** A section of a Pod page that folds away by tapping its title. */
export function PodPanel({
  title,
  hint,
  open,
  children,
}: {
  title: string;
  hint: React.ReactNode;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="pod-card">
      <summary className="cursor-pointer px-6 py-4 sm:px-8">
        <span className="text-3xl">{title}</span>
        <span className="mt-1 block text-base text-cream/70">{hint}</span>
      </summary>
      <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">{children}</div>
    </details>
  );
}
