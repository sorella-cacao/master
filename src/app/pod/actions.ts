"use server";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { textToBlocks } from "@/lib/content";
import type { Database } from "@/lib/supabase/database.types";
import { getSession } from "./session";

export type SaveState = { ok?: string; error?: string } | undefined;
type Db = SupabaseClient<Database>;

/** A problem with what was typed, shown next to the form. */
class FormError extends Error {}

const text = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const optionalText = (data: FormData, name: string) => text(data, name) || null;
const checked = (data: FormData, name: string) => data.get(name) === "on";

function required(data: FormData, name: string, what: string) {
  const value = text(data, name);
  if (!value) throw new FormError(`Enter ${what}.`);
  return value;
}

function price(data: FormData) {
  const value = Number(text(data, "price"));
  if (!text(data, "price") || !Number.isFinite(value) || value < 0) {
    throw new FormError("Enter a price of $0 or more.");
  }
  return Math.round(value * 100) / 100;
}

function eventDate(data: FormData, name = "event_date") {
  const value = text(data, name);
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new FormError("Choose a valid date.");
  return value || null;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workshop"
  );
}

async function uniqueSlug(supabase: Db, title: string, exceptId?: string) {
  const base = slugify(title);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const { data } = await supabase.from("workshops").select("id").eq("slug", slug).maybeSingle();
    if (!data || data.id === exceptId) return slug;
  }
}

/** One after the last position, given a query for the current last row. */
async function nextPosition(last: PromiseLike<{ data: { position: number } | null }>) {
  const { data } = await last;
  return (data?.position ?? -1) + 1;
}

function message(error: PostgrestError) {
  if (error.code === "23505") return "That name is already used here. Choose another.";
  console.error(error);
  return "Couldn't save. Please try again.";
}

/** Checks Pod access, runs the change, and refreshes the shop pages. */
async function run(
  change: (supabase: Db) => PromiseLike<{ error: PostgrestError | null }>,
  ok: string,
): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return { error: "This account doesn't have access to the Pod." };
  try {
    const { error } = await change(supabase);
    if (error) return { error: message(error) };
  } catch (e) {
    if (e instanceof FormError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok };
}

// Delivery

export async function saveDeliveryOption(_: SaveState, data: FormData) {
  return run((supabase) => {
    const freeOver = text(data, "free_over");
    const over = Number(freeOver);
    if (freeOver && (!Number.isFinite(over) || over <= 0)) {
      throw new FormError("Enter the free postage amount as a number, e.g. 150, or leave it empty.");
    }
    return supabase
      .from("delivery_options")
      .update({
        name: required(data, "name", "a name"),
        description: text(data, "description"),
        price: price(data),
        free_over: freeOver ? Math.round(over * 100) / 100 : null,
        is_active: checked(data, "is_active"),
      })
      .eq("id", text(data, "id"));
  }, "Saved. The cart uses this straight away.");
}

/** A new free postage code. */
export async function addDiscountCode(_: SaveState, data: FormData) {
  return run((supabase) => {
    const code = text(data, "code").toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{3,29}$/.test(code)) throw new FormError("Use 4 to 30 letters, numbers and dashes, e.g. FREEPOST-XMAS.");
    const uses = text(data, "max_uses");
    if (uses && (!Number.isInteger(Number(uses)) || Number(uses) < 1)) throw new FormError("Enter how many times it can be used, or leave it empty for any number.");
    return supabase.from("discount_codes").insert({ code, max_uses: uses ? Number(uses) : null, expires_on: eventDate(data, "expires_on") });
  }, "Added. It works straight away.");
}

export async function setDiscountCodeActive(_: SaveState, data: FormData) {
  const active = text(data, "active") === "true";
  return run(
    (supabase) => supabase.from("discount_codes").update({ is_active: active }).eq("code", text(data, "code")),
    active ? "Switched on" : "Switched off",
  );
}

// Products

export async function saveProduct(_: SaveState, data: FormData) {
  return run(
    (supabase) =>
      supabase
        .from("products")
        .update({
          title: required(data, "title", "a name"),
          description: textToBlocks(text(data, "description")),
          is_published: checked(data, "is_published"),
          available_until: eventDate(data, "available_until"),
          subheading: text(data, "subheading"),
        })
        .eq("id", text(data, "id")),
    "Saved",
  );
}

// Promotion

/** The strip across the top of every page and the banner on the home page. */
export async function savePromo(_: SaveState, data: FormData) {
  return run(
    (supabase) =>
      supabase
        .from("site_promo")
        .update({
          enabled: checked(data, "enabled"),
          product_id: text(data, "product_id") || null,
          strip_text: required(data, "strip_text", "the words for the strip"),
          banner_title: required(data, "banner_title", "the banner's heading"),
          banner_text: text(data, "banner_text"),
        })
        .eq("id", true),
    "Saved. The website shows it straight away.",
  );
}

export async function saveVariant(_: SaveState, data: FormData) {
  return run(
    (supabase) =>
      supabase
        .from("product_variants")
        .update({
          label: required(data, "label", "a name"),
          price: price(data),
          sold_out: checked(data, "sold_out"),
          ingredients: optionalText(data, "ingredients"),
        })
        .eq("id", text(data, "id")),
    "Saved",
  );
}

export async function addVariant(_: SaveState, data: FormData) {
  return run(async (supabase) => {
    const productId = text(data, "product_id");
    return supabase.from("product_variants").insert({
      product_id: productId,
      label: required(data, "label", "a name"),
      price: price(data),
      ingredients: optionalText(data, "ingredients"),
      position: await nextPosition(
        supabase
          .from("product_variants")
          .select("position")
          .eq("product_id", productId)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
    });
  }, "Added");
}

export async function deleteVariant(_: SaveState, data: FormData) {
  return run((supabase) => supabase.from("product_variants").delete().eq("id", text(data, "id")), "Deleted");
}

// Workshops

export async function saveWorkshop(_: SaveState, data: FormData) {
  return run(async (supabase) => {
    const id = text(data, "id");
    const title = required(data, "title", "a name");
    const { data: current } = await supabase.from("workshops").select("is_published").eq("id", id).single();
    return supabase
      .from("workshops")
      .update({
        title,
        event_date: eventDate(data),
        sold_out: checked(data, "sold_out"),
        is_published: checked(data, "is_published"),
        description: textToBlocks(text(data, "description")),
        // Until a workshop has been shown, its web address follows its name.
        ...(current && !current.is_published && { slug: await uniqueSlug(supabase, title, id) }),
      })
      .eq("id", id);
  }, "Saved");
}

export async function duplicateWorkshop(_: SaveState, data: FormData) {
  return run(async (supabase) => {
    const { data: original, error } = await supabase
      .from("workshops")
      .select("title, images, option_name, description, tickets:workshop_variants(label, price, position)")
      .eq("id", text(data, "id"))
      .single();
    if (error) return { error };

    const title = `${original.title} (copy)`;
    const { data: copy, error: insertError } = await supabase
      .from("workshops")
      .insert({
        title,
        slug: await uniqueSlug(supabase, title),
        images: original.images,
        option_name: original.option_name,
        description: original.description,
        // Hidden until it's been updated and switched on.
        is_published: false,
      })
      .select("id")
      .single();
    if (insertError) return { error: insertError };

    return supabase
      .from("workshop_variants")
      .insert(original.tickets.map((t) => ({ workshop_id: copy.id, label: t.label, price: t.price, position: t.position })));
  }, "Copied. The copy is at the top, hidden until you switch it on");
}

export async function deleteWorkshop(_: SaveState, data: FormData) {
  return run((supabase) => supabase.from("workshops").delete().eq("id", text(data, "id")), "Deleted");
}

export async function saveTicket(_: SaveState, data: FormData) {
  return run(
    (supabase) =>
      supabase
        .from("workshop_variants")
        .update({ label: required(data, "label", "a name"), price: price(data), sold_out: checked(data, "sold_out") })
        .eq("id", text(data, "id")),
    "Saved",
  );
}

export async function addTicket(_: SaveState, data: FormData) {
  return run(async (supabase) => {
    const workshopId = text(data, "workshop_id");
    return supabase.from("workshop_variants").insert({
      workshop_id: workshopId,
      label: required(data, "label", "a name"),
      price: price(data),
      position: await nextPosition(
        supabase
          .from("workshop_variants")
          .select("position")
          .eq("workshop_id", workshopId)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
    });
  }, "Added");
}

export async function deleteTicket(_: SaveState, data: FormData) {
  return run((supabase) => supabase.from("workshop_variants").delete().eq("id", text(data, "id")), "Deleted");
}
