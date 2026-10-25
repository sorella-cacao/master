import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in visitor and whether they're on the admins list (who may use the
 * Pod). Server Functions are public endpoints, so every Pod action checks this
 * again (and row level security refuses changes from anyone not on that list).
 */
export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/pod/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", claims.sub)
    .maybeSingle();

  return { supabase, email: claims.email as string | undefined, isAdmin: !!admin };
}

