"use server";

import { revalidatePath } from "next/cache";
import type { SaveState } from "../actions";
import { getSession } from "../session";
import { NUTRITION_ROWS, type Nutrition, TEXT_PARTS } from "./label-data";

const NO_ACCESS: SaveState = { error: "This account doesn't have access to the Pod." };

const text = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

function failed(error: { code?: string }): SaveState {
  if (error.code === "23505") return { error: "There’s already a label with that name and size." };
  console.error(error);
  return { error: "Couldn't save. Please try again." };
}

/** The label's details from the form, or a message saying what's missing. */
function details(data: FormData) {
  const label = {
    size: text(data, "size") === "small" ? "small" : "large",
    name: text(data, "name"),
    batch_code: text(data, "batch_code"),
    ingredients: text(data, "ingredients"),
    ingredient_notes: text(data, "ingredient_notes"),
    may_contain: text(data, "may_contain"),
    servings_per_package: text(data, "servings_per_package"),
    serving_size: text(data, "serving_size"),
    nutrition: Object.fromEntries(
      NUTRITION_ROWS.map(([key]) => [key, [text(data, `${key}:serving`), text(data, `${key}:100g`)]]),
    ) as Nutrition,
    // Only sizes changed from the standard 100% are kept.
    text_sizes: Object.fromEntries(
      TEXT_PARTS.map(([part]) => [part, Number(text(data, `size:${part}`) || 100)] as const).filter(
        ([, size]) => Number.isFinite(size) && size !== 100 && size >= 50 && size <= 200,
      ),
    ),
  };
  if (!label.name) return { error: "Enter the flavour, e.g. 84% Dark." };
  if (!label.batch_code) return { error: "Enter the batch code, e.g. 84 or HZ." };
  if (!label.ingredients) return { error: "Enter the ingredients." };
  if (!label.servings_per_package) return { error: "Enter the servings per package, e.g. 2.5." };
  return { label };
}

export async function saveLabel(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const { label, error } = details(data);
  if (!label) return { error };
  const saved = await supabase.from("labels").update(label).eq("id", text(data, "id"));
  if (saved.error) return failed(saved.error);
  revalidatePath("/pod/labels");
  return { ok: "Saved. Labels you make from now on use these details." };
}

export async function addLabel(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const { label, error } = details(data);
  if (!label) return { error };
  const added = await supabase.from("labels").insert(label);
  if (added.error) return failed(added.error);
  revalidatePath("/pod/labels");
  return { ok: `Added ${label.size === "small" ? "Small" : "Large"} ${label.name}.` };
}

export async function deleteLabel(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const { error } = await supabase.from("labels").delete().eq("id", text(data, "id"));
  if (error) return failed(error);
  revalidatePath("/pod/labels");
  return { ok: "Deleted" };
}
