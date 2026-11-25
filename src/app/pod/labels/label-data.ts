import "server-only";
import type { getSession } from "../session";
import type { Stamp } from "./stamp";

type Db = Awaited<ReturnType<typeof getSession>>["supabase"];

/**
 * A label as designed in Canva, kept as PDFs in Sorella › Labels › Canva: its front (logo) and its
 * back (ingredients), either of which may be missing. The back gets the best before date and batch
 * number stamped where `stamps` says.
 */
export type Label = {
  id: string;
  size: "small" | "large";
  name: string;
  frontFile: string;
  backFile: string;
  stamps: Stamp[];
  /** The flavour it's for. */
  stockItemId: string | null;
};

export async function getLabels(supabase: Db): Promise<Label[]> {
  const { data, error } = await supabase
    .from("labels")
    .select("id, size, name, front_file, back_file, stamps, stock_item_id")
    .or("front_file.neq.,back_file.neq.")
    .order("size", { ascending: false })
    .order("position");
  if (error) throw error;
  return data.map((l) => ({
    id: l.id,
    size: l.size === "small" ? "small" : "large",
    name: l.name,
    frontFile: l.front_file,
    backFile: l.back_file,
    stamps: l.stamps as Stamp[],
    stockItemId: l.stock_item_id,
  }));
}
