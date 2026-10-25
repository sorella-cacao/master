import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only the Pod (the shop admin area) uses logins; shop pages stay static.
export const config = {
  matcher: ["/pod/:path*"],
};
