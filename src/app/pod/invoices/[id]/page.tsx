import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PodNav } from "../../pod-nav";
import { getSession } from "../../session";
import { getInvoice } from "../invoice-data";
import { InvoiceEditor } from "../invoice-editor";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage(props: PageProps<"/pod/invoices/[id]">) {
  const { supabase, email, isAdmin } = await getSession();
  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="font-script text-6xl text-gold">The Pod</h1>
        <p className="mt-6 text-xl">{email ?? "This account"} doesn’t have access to the Pod yet.</p>
      </div>
    );
  }

  const { id } = await props.params;
  const invoice = await getInvoice(supabase, id);
  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <header className="space-y-6">
        <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
        <PodNav current="/pod/invoices" />
      </header>

      <section className="pod-card space-y-5 p-6 sm:p-8">
        <Link href="/pod/invoices" className="eyebrow text-cream/70 hover:text-gold">
          ← All invoices
        </Link>
        <InvoiceEditor invoice={invoice} />
        {invoice.orderId && (
          <div>
            <Link href={`/pod/orders?saved=${invoice.orderId}`} className="eyebrow text-cream/70 hover:text-gold">
              Go to its order
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
