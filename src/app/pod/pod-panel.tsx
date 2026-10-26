/** A section of a Pod page that folds away by tapping its title. */
export function PodPanel({
  title,
  hint,
  open,
  small = false,
  children,
}: {
  title: string;
  hint: React.ReactNode;
  open?: boolean;
  /** A slimmer box with a smaller title, for long lists such as customers. */
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className={`pod-card ${small ? "rounded-xl" : ""}`}>
      <summary className={`cursor-pointer ${small ? "px-5 py-2.5 sm:px-6" : "px-6 py-4 sm:px-8"}`}>
        <span className={small ? "text-xl" : "text-3xl"}>{title}</span>
        <span className={`block text-cream/70 ${small ? "text-sm" : "mt-1 text-base"}`}>{hint}</span>
      </summary>
      <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">{children}</div>
    </details>
  );
}
