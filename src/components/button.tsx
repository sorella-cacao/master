import Link from "next/link";

const base =
  "eyebrow inline-flex items-center justify-center rounded-full px-7 py-3.5 transition-colors";

const variants = {
  solid: "bg-caramel text-cacao-950 hover:bg-gold",
  outline: "border border-current hover:bg-cream hover:text-cacao-900",
};

export function ButtonLink({
  href,
  children,
  variant = "solid",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export const buttonClass = (variant: keyof typeof variants = "solid") =>
  `${base} ${variants[variant]}`;
