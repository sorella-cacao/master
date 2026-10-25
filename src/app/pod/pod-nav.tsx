import Link from "next/link";
import { logOut } from "./login/actions";

const sections = [
  { href: "/pod", label: "Shop" },
  { href: "/pod/receipts", label: "Receipts" },
] as const;

/** Switches between the Pod's sections, with a sign-out button. */
export function PodNav({ current }: { current: (typeof sections)[number]["href"] }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <nav aria-label="The Pod" className="flex gap-2">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            aria-current={s.href === current ? "page" : undefined}
            className={`eyebrow rounded-full px-4 py-2 transition-colors ${
              s.href === current
                ? "bg-caramel text-cacao-950"
                : "border border-white/20 text-cream/70 hover:border-gold hover:text-gold"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <form action={logOut}>
        <button
          type="submit"
          className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 hover:border-gold hover:text-gold"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
