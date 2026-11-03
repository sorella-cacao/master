import type { Metadata } from "next";
import { addDays, sydneyToday } from "@/lib/weeks";
import { PodForm } from "../pod-form";
import { PodNav } from "../pod-nav";
import { PodPanel } from "../pod-panel";
import { getSession } from "../session";
import { addLabel, deleteLabel, saveLabel } from "./actions";
import { type Label, NUTRITION_ROWS, getLabels, getSizeLayouts, labelTitle } from "./label-data";
import type { Layout } from "./label-layout";
import { LayoutEditor } from "./layout-editor";
import { LabelMaker } from "./label-maker";

export const metadata: Metadata = { title: "Labels" };

export default async function LabelsPage() {
  const { supabase, email, isAdmin } = await getSession();
  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="font-script text-6xl text-gold">The Pod</h1>
        <p className="mt-6 text-xl">{email ?? "This account"} doesn’t have access to the Pod yet.</p>
      </div>
    );
  }

  const [labels, sizeLayouts] = await Promise.all([getLabels(supabase), getSizeLayouts(supabase)]);
  const today = sydneyToday();

  return (
    <div className="space-y-6">
      <header className="space-y-6">
        <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
        <PodNav current="/pod/labels" />
      </header>

      <PodPanel
        open
        title="Print labels"
        hint="Pick the best before date, the first 4 batch digits and how many of each label. They’re saved as PDFs and printed with their logos."
      >
        <LabelMaker
          labels={labels.map((l) => ({
            id: l.id,
            size: l.size,
            name: l.name,
            batchCode: l.batchCode,
            title: labelTitle(l),
            logoFile: l.logoFile,
          }))}
          today={today}
          defaultBestBefore={addDays(today, 365)}
        />
      </PodPanel>

      <div className="space-y-2">
        {labels.map((label) => (
          <PodPanel key={label.id} small title={`Edit ${label.size === "small" ? "Small" : "Large"} ${label.name}`} hint={label.ingredients}>
            <PodForm action={saveLabel} submitLabel="Save label">
              <input type="hidden" name="id" value={label.id} />
              <LabelFields label={label} sizeLayouts={sizeLayouts} />
            </PodForm>
            <PodForm
              action={deleteLabel}
              submitLabel="Delete label"
              variant="quiet"
              confirmMessage={`Delete the ${label.size} ${label.name} label?`}
              confirmDetail="Labels you’ve already saved as PDFs aren’t affected."
            >
              <input type="hidden" name="id" value={label.id} />
            </PodForm>
          </PodPanel>
        ))}
      </div>

      <PodPanel title="Add a label" hint="A new flavour or size. Copy the details from its current label.">
        <PodForm action={addLabel} submitLabel="Add label" resetOnSuccess>
          <LabelFields sizeLayouts={sizeLayouts} />
        </PodForm>
      </PodPanel>
    </div>
  );
}

function LabelFields({ label, sizeLayouts }: { label?: Label; sizeLayouts: Record<"large" | "small", Layout> }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow mb-1 block text-xs text-cream/70">Size</span>
          <select name="size" defaultValue={label?.size ?? "large"} className="pod-input py-2 text-sm">
            <option value="large">Large</option>
            <option value="small">Small</option>
          </select>
        </label>
        <Field label="Flavour" name="name" value={label?.name} placeholder="e.g. 84% Dark" />
        <Field label="Batch code (after the date)" name="batch_code" value={label?.batchCode} placeholder="e.g. 84 or HZ" />
        <Field label="May contain (printed bold)" name="may_contain" value={label?.mayContain} placeholder="e.g. Milk & nuts" />
        <label className="block sm:col-span-2">
          <span className="eyebrow mb-1 block text-xs text-cream/70">Ingredients</span>
          <textarea
            name="ingredients"
            rows={2}
            defaultValue={label?.ingredients ?? ""}
            placeholder="e.g. Cacao beans (84%)**, rapadura sugar(16%)*"
            className="pod-input py-2 text-sm"
          />
        </label>
        <Field
          label="Note under the ingredients"
          name="ingredient_notes"
          value={label?.ingredientNotes ?? "*Organic Ingredients **Ethically farmed"}
          wide
        />
        <Field label="Servings per package" name="servings_per_package" value={label?.servingsPerPackage} placeholder="e.g. 5.4" />
        <Field label="Serving size" name="serving_size" value={label?.servingSize ?? "20g"} />
        <Field
          label="Logo label (in Sorella › Logos › Current Logos)"
          name="logo_file"
          value={label?.logoFile}
          placeholder="e.g. 75% Dark/Large Logo- 75% Dark (5).pdf"
          wide
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/15">
        <table className="w-full table-fixed font-sans text-sm">
          <caption className="eyebrow border-b border-white/15 bg-white/5 px-3 py-1.5 text-left text-cream/80">Nutrition information</caption>
          <thead>
            <tr className="text-xs text-cream/70">
              <th scope="col" className="px-3 py-1 text-left font-normal" />
              <th scope="col" className="w-32 px-3 py-1 text-right font-normal">Per serving</th>
              <th scope="col" className="w-32 px-3 py-1 text-right font-normal">Per 100 g</th>
            </tr>
          </thead>
          <tbody>
            {NUTRITION_ROWS.map(([key, name], i) => (
              <tr key={key} className={i % 2 ? "" : "bg-white/[0.03]"}>
                <th scope="row" className="px-3 py-1 text-left font-normal">
                  {name.replace(" - ", "– ")}
                </th>
                {(["serving", "100g"] as const).map((column, c) => (
                  <td key={column} className="px-3 py-1 text-right">
                    <input
                      name={`${key}:${column}`}
                      defaultValue={label?.nutrition[key]?.[c] ?? ""}
                      placeholder={key === "energy" ? "e.g. 481 kJ" : key === "sodium" ? "e.g. 1 mg" : "e.g. 7.5 g"}
                      aria-label={`${name.trim()} ${column === "serving" ? "per serving" : "per 100 g"}`}
                      className="pod-input w-28 px-2 py-1 text-right text-sm"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LayoutEditor
        initialSize={label?.size ?? "large"}
        initialLayout={label ? label.layout : sizeLayouts.large}
        initialOwn={label?.ownLayout ?? false}
        sizeLayouts={sizeLayouts}
      />
    </div>
  );
}



function Field({
  label,
  name,
  value,
  placeholder,
  wide,
}: {
  label: string;
  name: string;
  value?: string | null;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="eyebrow mb-1 block text-xs text-cream/70">{label}</span>
      <input name={name} defaultValue={value ?? ""} placeholder={placeholder} className="pod-input py-2 text-sm" />
    </label>
  );
}
