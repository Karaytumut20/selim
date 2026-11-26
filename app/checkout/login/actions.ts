"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { customerSessionCookie, isTestCustomerEmail, testCheckoutEnabled } from "../../../lib/customer-auth";
import { createPublicSupabaseClient } from "../../../lib/supabase/server";

export async function signInTestCustomer(fields: FormData) {
  const email = fields.get("email");
  const password = fields.get("password");
  const supabase = createPublicSupabaseClient();
  if (!testCheckoutEnabled() || !supabase || typeof email !== "string" || !isTestCustomerEmail(email.trim()) || typeof password !== "string") {
    redirect("/checkout/login?error=1");
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.session || !data.user.email || !isTestCustomerEmail(data.user.email)) redirect("/checkout/login?error=1");
  (await cookies()).set(customerSessionCookie, data.session.access_token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: data.session.expires_in,
  });
  redirect("/checkout");
}
