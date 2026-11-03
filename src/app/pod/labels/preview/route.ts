import { addDays, sydneyToday } from "@/lib/weeks";
import { getSession } from "../../session";
import { batchNumber, labelDate } from "../batch-number";
import { labelFromForm } from "../label-form";
import { renderLabelPdf } from "../label-pdf";

/** The label as its edit form has it now (saved or not), as a PDF for the preview beside the form. */
export async function POST(request: Request) {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return new Response("Not allowed", { status: 403 });

  const { row, layout } = await request.formData().then(labelFromForm);
  const { data: settings } = await supabase.from("invoice_settings").select("phone").eq("id", true).single();
  const today = sydneyToday();
  const pdf = await renderLabelPdf(
    {
      id: "",
      size: row.size,
      name: row.name,
      batchCode: row.batch_code,
      ingredients: row.ingredients,
      ingredientNotes: row.ingredient_notes,
      mayContain: row.may_contain,
      servingsPerPackage: row.servings_per_package,
      servingSize: row.serving_size,
      nutrition: row.nutrition,
      layout,
      ownLayout: false,
      logoFile: row.logo_file,
    },
    // A sample best before and batch number, as the next run would print them.
    { bestBefore: labelDate(addDays(today, 365)), batch: batchNumber(`${today.slice(8, 10)}${today.slice(5, 7)}`, today, row.batch_code), phone: settings?.phone ?? "" },
    { upright: true },
  );
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Cache-Control": "private, no-store" } });
}
