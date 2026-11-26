"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clearOfferSession, offerAccountOrigin, offerAccountsConfigured, offerReturnPath, saveOfferSession } from "../../lib/offer-account";
import { offerRecoveryClient, recoveryCookieOptions, recoverySessionCookie, recoveryVerifierCookie, resetCallbackPath } from "../../lib/offer-recovery";
import { createPublicSupabaseClient } from "../../lib/supabase/server";

export type AccountMessage = { error?: string; notice?: string };

function accountEmail(form: FormData) {
  const email = form.get("email");
  if (typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function credentials(form: FormData) {
  const email = accountEmail(form);
  const password = form.get("password");
  if (!email || typeof password !== "string" || password.length > 128 || !password.length) return null;
  return { email, password };
}

export async function signInForOffers(_: AccountMessage, form: FormData): Promise<AccountMessage> {
  const input = credentials(form);
  const supabase = createPublicSupabaseClient();
  if (!supabase || !offerAccountsConfigured()) return { error: "Account sign-in is currently unavailable." };
  if (!input) return { error: "Enter a valid email address and password." };
  const { data, error } = await supabase.auth.signInWithPassword(input);
  if (error?.code === "email_not_confirmed") return { error: "Confirm your email address before signing in." };
  if (error || !data.session || !data.user?.email_confirmed_at) return { error: "Check your email address and password and try again." };
  await saveOfferSession(data.session.access_token, data.session.expires_in);
  redirect(offerReturnPath(form.get("next")));
}

export async function registerForOffers(_: AccountMessage, form: FormData): Promise<AccountMessage> {
  const input = credentials(form);
  const supabase = createPublicSupabaseClient();
  const origin = offerAccountOrigin();
  if (!supabase || !origin || !offerAccountsConfigured()) return { error: "Account registration is currently unavailable." };
  if (!input || input.password.length < 8) return { error: "Enter a valid email and a password of at least 8 characters." };
  if (input.password !== form.get("confirmPassword")) return { error: "The passwords do not match." };

  const next = offerReturnPath(form.get("next"));
  const signInUrl = new URL("/account/sign-in", origin);
  signInUrl.searchParams.set("next", next);
  const { data, error } = await supabase.auth.signUp({ ...input, options: { emailRedirectTo: signInUrl.href } });
  if (error?.code === "weak_password") return { error: "Choose a stronger password and try again." };
  if (error?.status === 429) return { error: "Too many attempts. Wait a few minutes and try again." };
  if (error && !["user_already_exists", "email_exists"].includes(error.code ?? "")) {
    return { error: "We could not start registration. Please try again later." };
  }
  if (data.session && data.user?.email_confirmed_at) {
    await saveOfferSession(data.session.access_token, data.session.expires_in);
    redirect(next);
  }
  return { notice: "Check your inbox for a confirmation link. If you already have an account, sign in to continue." };
}

export async function signOutOfOffers() {
  await clearOfferSession();
  redirect("/products");
}

export async function requestOfferPasswordReset(_: AccountMessage, form: FormData): Promise<AccountMessage> {
  const email = accountEmail(form);
  const origin = offerAccountOrigin();
  const { client, verifier } = offerRecoveryClient();
  if (!origin || !client) return { error: "Password reset is currently unavailable. Please try again later." };
  if (!email) return { error: "Enter a valid email address." };

  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: new URL(resetCallbackPath, origin).href });
  const storedVerifier = verifier();
  if (!error && storedVerifier) {
    const jar = await cookies();
    jar.set(recoverySessionCookie, "", recoveryCookieOptions(0));
    jar.set(recoveryVerifierCookie, storedVerifier, recoveryCookieOptions(3600));
  }
  return { notice: "If an account exists for that email, its password reset link will arrive shortly. Open the newest link in this browser." };
}

export async function updateOfferPassword(_: AccountMessage, form: FormData): Promise<AccountMessage> {
  const password = form.get("password");
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return { error: "Choose a password between 8 and 128 characters." };
  }
  if (password !== form.get("confirmPassword")) return { error: "The passwords do not match." };

  const { client } = offerRecoveryClient();
  const jar = await cookies();
  const [accessToken, refreshToken] = (jar.get(recoverySessionCookie)?.value ?? "").split("|");
  if (!client || !accessToken || !refreshToken) redirect("/account/reset-password?error=expired");
  const session = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (session.error) {
    jar.set(recoverySessionCookie, "", recoveryCookieOptions(0));
    redirect("/account/reset-password?error=expired");
  }
  const { error } = await client.auth.updateUser({ password });
  if (error?.code === "weak_password") return { error: "Choose a stronger password and try again." };
  if (error?.code === "same_password") return { error: "Choose a password different from your current password." };
  if (error) return { error: "We could not update your password. Try again or request a new link." };

  await client.auth.signOut({ scope: "global" });
  jar.set(recoverySessionCookie, "", recoveryCookieOptions(0));
  await clearOfferSession();
  redirect("/account/sign-in?password=updated");
}
