import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

/**
 * Reads the public catalogue without cookies, so shop pages stay static and are
 * refreshed when the admin saves a change.
 */
export function createPublicClient() {
  const { url, key } = supabaseEnv();
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
