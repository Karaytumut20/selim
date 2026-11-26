import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createPublicSupabaseClient } from "./supabase/server";

export const customerSessionCookie = "gws_test_customer";
export const testCheckoutEnabled = () => process.env.ENABLE_TEST_CHECKOUT === "true";
export const isTestCustomerEmail = (email: string) =>
  Boolean(process.env.TEST_CUSTOMER_EMAIL?.trim() &&
    process.env.TEST_CUSTOMER_EMAIL.trim().toLowerCase() === email.toLowerCase());

export async function getCustomerUser() {
  if (!testCheckoutEnabled()) return null;
  const token = (await cookies()).get(customerSessionCookie)?.value;
  const supabase = createPublicSupabaseClient();
  if (!token || !supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  const user = error ? null : data.user;
  return user?.email && isTestCustomerEmail(user.email) ? { id: user.id, email: user.email.toLowerCase() } : null;
}

export async function requireCustomerUser(_path: string) {
  void _path;
  const user = await getCustomerUser();
  if (!user) redirect("/checkout/login");
  return user;
}
