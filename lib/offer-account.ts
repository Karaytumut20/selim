import { cookies } from "next/headers";
import { createPublicSupabaseClient } from "./supabase/server";

const sessionCookie = "gws_offer_customer";
const offerPathPattern = /^\/products\/[a-zA-Z0-9_-]{1,160}\/offer$/;

export function offerReturnPath(next: unknown) {
  return typeof next === "string" && offerPathPattern.test(next) ? next : "/account/offers";
}

export function offerAuthPath(mode: "sign-in" | "register", next: string) {
  return `/account/${mode}?${new URLSearchParams({ next: offerReturnPath(next) })}`;
}

export function offerAccountOrigin() {
  const configured = process.env.OFFER_SITE_URL?.trim() || process.env.CHECKOUT_ORIGIN?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.origin !== configured ||
        (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname)))) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function offerAccountsConfigured() {
  return Boolean(offerAccountOrigin() && process.env.SUPABASE_URL?.trim() &&
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export async function getOfferCustomer() {
  const token = (await cookies()).get(sessionCookie)?.value;
  const supabase = createPublicSupabaseClient();
  if (!token || !supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  const user = data.user;
  if (error || !user?.email || !user.email_confirmed_at) return null;
  return { id: user.id, email: user.email.toLowerCase() };
}

export async function saveOfferSession(token: string, expiresIn: number) {
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: offerAccountOrigin()?.startsWith("https:") ?? process.env.NODE_ENV === "production",
    maxAge: expiresIn,
    path: "/",
  });
}

export async function clearOfferSession() {
  (await cookies()).delete(sessionCookie);
}
