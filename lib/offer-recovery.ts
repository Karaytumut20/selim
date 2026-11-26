import { offerAccountOrigin } from "./offer-account";
import { createPublicSupabaseClient } from "./supabase/server";

export const resetPasswordPath = "/account/reset-password";
export const resetCallbackPath = `${resetPasswordPath}/callback`;
export const recoveryVerifierCookie = "gws_offer_recovery_verifier";
export const recoverySessionCookie = "gws_offer_recovery_session";

export function recoveryCookieOptions(maxAge: number) {
  return { httpOnly: true, secure: offerAccountOrigin()?.startsWith("https:") ?? true,
    sameSite: "lax" as const, path: resetPasswordPath, maxAge };
}

export function offerRecoveryClient(storedVerifier?: string) {
  const storageKey = "gws-offer-password-recovery";
  const verifierKey = `${storageKey}-code-verifier`;
  const storage = new Map<string, string>();
  if (storedVerifier) storage.set(verifierKey, storedVerifier);
  const client = createPublicSupabaseClient({
    flowType: "pkce", persistSession: true, storageKey,
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value); },
      removeItem: (key) => { storage.delete(key); },
    },
  });
  return { client, verifier: () => storage.get(verifierKey) };
}
