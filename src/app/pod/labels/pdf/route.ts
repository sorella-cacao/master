import type { NextRequest } from "next/server";
import { sydneyToday } from "@/lib/weeks";
import { getSession } from "../../session";
import { batchNumber, labelDate } from "../batch-number";
import { getLabels, labelTitle } from "../label-data";
import { renderLabelPdf } from "../label-pdf";

/** One label as a PDF: ?id=…&best_before=2027-10-28&batch=2610 */
export async function GET(request: NextRequest) {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return new Response("Not allowed", { status: 403 });

  const params = request.nextUrl.searchParams;
  const bestBefore = params.get("best_before") ?? "";
  const digits = params.get("batch") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bestBefore) || !/^\d{4}$/.test(digits)) {
    return new Response("Enter the best before date and 4 batch digits", { status: 400 });
  }

  const label = (await getLabels(supabase)).find((l) => l.id === params.get("id"));
  if (!label) return new Response("Label not found", { status: 404 });
  const { data: settings } = await supabase.from("invoice_settings").select("phone").eq("id", true).single();

  const pdf = await renderLabelPdf(label, {
    bestBefore: labelDate(bestBefore),
    batch: batchNumber(digits, sydneyToday(), label.batchCode),
    phone: settings?.phone ?? "",
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${labelTitle(label).replace(/[^\w .&%()-]/g, "")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
