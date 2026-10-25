import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Sorella Cacao" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <section className="grain bg-cacao-900">
      <div className="mx-auto max-w-5xl px-5 pb-28 pt-10 sm:px-8 md:pt-14">{children}</div>
    </section>
  );
}
