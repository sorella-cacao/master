import type { NextRequest } from "next/server";
import { getSession } from "../../../session";
import { billToName, getInvoice, invoiceNumber } from "../../invoice-data";
import { renderInvoicePdf } from "../../invoice-pdf";

/** The invoice as a PDF: shown in the page's preview, or downloaded with ?download=1. */
export async function GET(request: NextRequest, ctx: RouteContext<"/pod/invoices/[id]/pdf">) {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return new Response("Not allowed", { status: 403 });

  const { id } = await ctx.params;
  const invoice = await getInvoice(supabase, id);
  if (!invoice) return new Response("Invoice not found", { status: 404 });

  const pdf = await renderInvoicePdf(invoice);
  const filename = `Invoice ${invoiceNumber(invoice.number)} - ${billToName(invoice.billTo)}.pdf`.replace(/[^\w .&()-]/g, "");
  const disposition = request.nextUrl.searchParams.has("download") ? "attachment" : "inline";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
