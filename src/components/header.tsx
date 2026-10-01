"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/data/site";
import { useCart } from "./cart";

export function Header() {
  const pathname = usePathname();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const overHero = pathname === "/" && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu after navigating.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset UI state on route change
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        overHero
          ? "bg-transparent"
          : "border-b border-white/5 bg-cacao-950/90 backdrop-blur"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label={site.name}>
          <Image
            src="/images/logo.webp"
            alt=""
            width={44}
            height={45}
            className="rounded-full"
            priority
          />
          <span className="font-script text-3xl leading-none text-gold">
            {site.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex" aria-label="Main">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`eyebrow transition-colors hover:text-gold ${
                isActive(item.href) ? "text-gold" : "text-cream/80"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <CartLink count={count} />
        </nav>

        <div className="flex items-center gap-5 md:hidden">
          <CartLink count={count} />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label="Menu"
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5"
          >
            <span
              className={`h-px w-6 bg-cream transition ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
            />
            <span
              className={`h-px w-6 bg-cream transition ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          className="border-t border-white/5 bg-cacao-950 px-5 pb-8 pt-4 md:hidden"
          aria-label="Mobile"
        >
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block py-3 text-2xl ${isActive(item.href) ? "text-gold" : "text-cream"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

function CartLink({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      className="eyebrow flex items-center gap-2 text-cream/80 transition-colors hover:text-gold"
    >
      Cart
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-caramel px-1.5 text-[0.65rem] tracking-normal text-cacao-950">
        {count}
      </span>
    </Link>
  );
}
