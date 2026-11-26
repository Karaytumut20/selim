"use server";

import { redirect } from "next/navigation";
import { getAdminAccess } from "../../../lib/admin-auth";
import { createAdminSupabaseClient } from "../../../lib/supabase/server";

export async function reviewProductOffer(form: FormData) {
  if (!(await getAdminAccess()).allowed) redirect("/admin/login");
  const id = form.get("id");
  const status = form.get("status");
  if (typeof id !== "string" || !/^[\da-f-]{36}$/i.test(id) || (status !== "reviewed" && status !== "declined")) {
    redirect("/admin/offers?error=1");
  }
  const { data, error } = await createAdminSupabaseClient().from("product_offers")
    .update({ status, reviewed_at: new Date().toISOString() }).eq("id", id).eq("status", "pending").select("id");
  if (error || !data.length) redirect("/admin/offers?error=1");
  redirect("/admin/offers?updated=1");
}
