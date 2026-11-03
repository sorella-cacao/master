import "server-only";
import { NUTRITION_ROWS, type Nutrition } from "./label-data";
import { cleanLayout } from "./label-layout";

const text = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

/**
 * A label's details from its edit form (used to save it and to preview it): the row to save, its
 * layout and whether that layout is just for this label or for every label of its size.
 */
export function labelFromForm(data: FormData) {
  const row = {
    size: text(data, "size") === "small" ? ("small" as const) : ("large" as const),
    name: text(data, "name"),
    batch_code: text(data, "batch_code"),
    ingredients: text(data, "ingredients"),
    ingredient_notes: text(data, "ingredient_notes"),
    may_contain: text(data, "may_contain"),
    servings_per_package: text(data, "servings_per_package"),
    serving_size: text(data, "serving_size"),
    // Typed or pasted as a path; Finder's "Copy as Pathname" gives the whole path, so keep what's after Current Logos.
    logo_file: text(data, "logo_file").replace(/^.*Current Logos\//, "").replace(/^\/+/, ""),
    nutrition: Object.fromEntries(
      NUTRITION_ROWS.map(([key]) => [key, [text(data, `${key}:serving`), text(data, `${key}:100g`)]]),
    ) as Nutrition,
  };
  let layout = {};
  try {
    layout = cleanLayout(JSON.parse(text(data, "layout") || "{}"));
  } catch {
    // A garbled layout is treated as the standard one.
  }
  return { row, layout, ownLayout: text(data, "layout_scope") === "label" };
}

/** What's missing before a label can be saved, if anything. */
export function missing(row: ReturnType<typeof labelFromForm>["row"]) {
  if (!row.name) return "Enter the flavour, e.g. 84% Dark.";
  if (!row.batch_code) return "Enter the batch code, e.g. 84 or HZ.";
  if (!row.ingredients) return "Enter the ingredients.";
  if (!row.servings_per_package) return "Enter the servings per package, e.g. 2.5.";
  return null;
}
