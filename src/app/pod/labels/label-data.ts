import "server-only";
import type { getSession } from "../session";

type Db = Awaited<ReturnType<typeof getSession>>["supabase"];

/** Nutrition panel rows, per serving then per 100 g, as printed, e.g. ["503 kJ", "2516 kJ"]. */
export type Nutrition = Record<"energy" | "protein" | "fat" | "saturated" | "carbohydrate" | "sugars" | "sodium", [string, string]>;

/** The nutrition panel's rows, in order, with their printed names. */
export const NUTRITION_ROWS: [keyof Nutrition, string][] = [
  ["energy", "Energy"],
  ["protein", "Protein"],
  ["fat", "Fat, total"],
  ["saturated", " - saturated"],
  ["carbohydrate", "Carbohydrate"],
  ["sugars", " - sugars"],
  ["sodium", "Sodium"],
];

export type Label = {
  id: string;
  size: "small" | "large";
  name: string;
  batchCode: string;
  ingredients: string;
  ingredientNotes: string;
  mayContain: string;
  servingsPerPackage: string;
  servingSize: string;
  nutrition: Nutrition;
};

/** What changes with each print run. */
export type PrintRun = { bestBefore: string; batch: string; phone: string };

export async function getLabels(supabase: Db): Promise<Label[]> {
  const { data, error } = await supabase
    .from("labels")
    .select("id, size, name, batch_code, ingredients, ingredient_notes, may_contain, servings_per_package, serving_size, nutrition")
    .order("size", { ascending: false })
    .order("position");
  if (error) throw error;
  return data.map((l) => ({
    id: l.id,
    size: l.size === "small" ? "small" : "large",
    name: l.name,
    batchCode: l.batch_code,
    ingredients: l.ingredients,
    ingredientNotes: l.ingredient_notes,
    mayContain: l.may_contain,
    servingsPerPackage: l.servings_per_package,
    servingSize: l.serving_size,
    nutrition: l.nutrition as Nutrition,
  }));
}

/** "Small Ingredients- 84% Dark", the way the Canva labels were named. */
export const labelTitle = (label: Pick<Label, "size" | "name">) =>
  `${label.size === "small" ? "Small" : "Large"} Ingredients- ${label.name}`;
