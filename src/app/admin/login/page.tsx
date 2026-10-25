import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin sign in" };

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/admin");

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-script text-6xl text-gold">Admin</h1>
      <p className="mt-3 text-cream/70">Sign in to edit your products and workshops.</p>
      <div className="mt-8 rounded-2xl border border-white/10 bg-cacao-950/40 p-6 sm:p-8">
        <LoginForm />
      </div>
    </div>
  );
}
