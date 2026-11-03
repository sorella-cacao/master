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

/** Parts of a label whose text size can be changed, with what they're called in the Pod. */
export const TEXT_PARTS = [
  ["headline", "Headline"],
  ["story", "Story (large labels)"],
  ["nutrition", "Nutrition panel"],
  ["ingredients", "Ingredients & may contain"],
  ["details", "Best before, batch & contact"],
] as const;
export type TextPart = (typeof TEXT_PARTS)[number][0];

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
  /** Percentages of the standard size, e.g. { ingredients: 110 }; a missing part is 100. */
  textSizes: Partial<Record<TextPart, number>>;
};

/** What changes with each print run. */
export type PrintRun = { bestBefore: string; batch: string; phone: string };

export async function getLabels(supabase: Db): Promise<Label[]> {
  const { data, error } = await supabase
    .from("labels")
    .select("id, size, name, batch_code, ingredients, ingredient_notes, may_contain, servings_per_package, serving_size, nutrition, text_sizes")
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
    textSizes: (l.text_sizes ?? {}) as Label["textSizes"],
  }));
}

/** "Small Ingredients- 84% Dark", the way the Canva labels were named. */
export const labelTitle = (label: Pick<Label, "size" | "name">) =>
  `${label.size === "small" ? "Small" : "Large"} Ingredients- ${label.name}`;
