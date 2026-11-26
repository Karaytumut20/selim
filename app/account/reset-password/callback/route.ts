import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { offerAccountOrigin } from "../../../../lib/offer-account";
import { offerRecoveryClient, recoveryCookieOptions, recoverySessionCookie, recoveryVerifierCookie, resetPasswordPath } from "../../../../lib/offer-recovery";

export async function GET(request: Request) {
  const origin = offerAccountOrigin();
  if (!origin) return new Response("Password reset is currently unavailable.", { status: 503 });

  const code = new URL(request.url).searchParams.get("code");
  const verifier = (await cookies()).get(recoveryVerifierCookie)?.value;
  const destination = new URL(resetPasswordPath, origin);
  const { client } = offerRecoveryClient(verifier);
  const recovery = code && /^[A-Za-z0-9_-]{20,200}$/.test(code) && verifier?.endsWith('/recovery"') && client
    ? await client.auth.exchangeCodeForSession(code) : null;
  const session = recovery?.data.session;
  if (!session) destination.searchParams.set("error", "expired");

  const response = NextResponse.redirect(destination, 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  if (session) {
    response.cookies.set(recoveryVerifierCookie, "", recoveryCookieOptions(0));
    response.cookies.set(recoverySessionCookie, `${session.access_token}|${session.refresh_token}`, recoveryCookieOptions(Math.min(600, session.expires_in)));
  }
  return response;
}
