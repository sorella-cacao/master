"use server";

import { revalidatePath } from "next/cache";
import type { SaveState } from "../actions";
import { getSession } from "../session";
import { labelFromForm, missing } from "./label-form";

const NO_ACCESS: SaveState = { error: "This account doesn't have access to the Pod." };

const text = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

function failed(error: { code?: string }): SaveState {
  if (error.code === "23505") return { error: "There’s already a label with that name and size." };
  console.error(error);
  return { error: "Couldn't save. Please try again." };
}

type Db = Awaited<ReturnType<typeof getSession>>["supabase"];

/**
 * Saves a label, with its layout either as its own or as the layout every label of its size shares
 * (which also takes away any layout of its own).
 */
async function save(supabase: Db, data: FormData, id?: string): Promise<SaveState> {
  const { row, layout, ownLayout } = labelFromForm(data);
  const problem = missing(row);
  if (problem) return { error: problem };
  const label = { ...row, layout: ownLayout ? layout : null };
  const saved = id ? await supabase.from("labels").update(label).eq("id", id) : await supabase.from("labels").insert(label);
  if (saved.error) return failed(saved.error);
  if (!ownLayout) {
    const shared = await supabase.from("label_layouts").update({ layout }).eq("size", row.size);
    if (shared.error) return failed(shared.error);
  }
  revalidatePath("/pod/labels");
  const which = ownLayout ? "this label’s own layout" : `the layout for all ${row.size} labels`;
  return { ok: id ? `Saved, with ${which}.` : `Added ${row.size === "small" ? "Small" : "Large"} ${row.name}, with ${which}.` };
}

export async function saveLabel(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  return save(supabase, data, text(data, "id"));
}

export async function addLabel(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  return save(supabase, data);
}

export async function deleteLabel(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const { error } = await supabase.from("labels").delete().eq("id", text(data, "id"));
  if (error) return failed(error);
  revalidatePath("/pod/labels");
  return { ok: "Deleted" };
}
