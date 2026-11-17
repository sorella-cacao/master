import { Cinzel_Decorative } from "next/font/google";

const cinzel = Cinzel_Decorative({ subsets: ["latin"], weight: "400" });

/**
 * The "Sorella Cacao" wordmark, in Cinzel Decorative (as on the automatic emails). Inherits the text
 * colour; size it with a font size. Hidden from screen readers, so put the name beside it.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`${cinzel.className} block whitespace-nowrap leading-none tracking-wide ${className}`}>
      Sorella Cacao
    </span>
  );
}
