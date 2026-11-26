"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminSessionCookie, isAdminEmail } from "../../../lib/admin-auth";
import { createPublicSupabaseClient } from "../../../lib/supabase/server";

export async function signIn(form: FormData) {
  const email = form.get("email");
  const password = form.get("password");
  const supabase = createPublicSupabaseClient();

  if (typeof email !== "string" || typeof password !== "string" || !supabase || !isAdminEmail(email.trim())) {
    redirect("/admin/login?error=1");
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.session || !data.user?.email || !isAdminEmail(data.user.email)) {
    redirect("/admin/login?error=1");
  }

  (await cookies()).set(adminSessionCookie, data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: data.session.expires_in,
  });
  redirect("/admin");
}

export async function signOut() {
  (await cookies()).delete(adminSessionCookie);
  redirect("/admin/login");
}
