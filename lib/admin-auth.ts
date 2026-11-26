import { cookies } from "next/headers";
import { createPublicSupabaseClient } from "./supabase/server";

export const adminSessionCookie = "gws_admin_session";

export function isAdminEmail(email: string) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .some((allowed) => Boolean(allowed.trim()) && allowed.trim().toLowerCase() === email.toLowerCase());
}

export async function getAdminAccess() {
  const token = (await cookies()).get(adminSessionCookie)?.value;
  const supabase = createPublicSupabaseClient();
  if (!token || !supabase) return { allowed: false, user: null };

  const { data, error } = await supabase.auth.getUser(token);
  const email = error ? undefined : data.user?.email;
  if (!email) return { allowed: false, user: null };

  return { allowed: isAdminEmail(email), user: { displayName: email } };
}

export async function requireAdminApiAccess() {
  const access = await getAdminAccess();
  if (access.allowed) return access;

  return {
    response: Response.json(
      { error: access.user ? "This account is not authorized for Content Studio." : "Admin authentication is required." },
      { status: access.user ? 403 : 401 },
    ),
  };
}

export function adminSignInPath() {
  return "/admin/login";
}
