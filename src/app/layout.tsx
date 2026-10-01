import type { Metadata } from "next";
import { Carattere, Cormorant_Garamond, Jost } from "next/font/google";
import { CartProvider } from "@/components/cart";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { site } from "@/data";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

const carattere = Carattere({
  variable: "--font-carattere",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: { default: site.name, template: `%s — ${site.name}` },
  description: site.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-AU"
      className={`${cormorant.variable} ${jost.variable} ${carattere.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col font-serif text-lg">
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
