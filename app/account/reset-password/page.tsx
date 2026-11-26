import Link from "next/link";
import { cookies } from "next/headers";
import { OfferRecoveryForm } from "../../../components/offer-recovery-form";
import { PageShell } from "../../../components/page-shell";
import { recoverySessionCookie } from "../../../lib/offer-recovery";

export const metadata = { title: "Reset password", referrer: "no-referrer" as const, robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [jar, { error }] = await Promise.all([cookies(), searchParams]);
  const canReset = Boolean(jar.get(recoverySessionCookie)?.value) && !error;
  return <PageShell><section className="content-section"><div className="container"><div className="offer-panel">
    <h1>Reset password</h1>
    {canReset ? <><p>Choose a new password for your customer account.</p><OfferRecoveryForm reset /></> :
      <p role="alert">This reset link is invalid or has expired. Request a new link and open it in the same browser.</p>}
    <Link href="/account/forgot-password">Request a new reset link</Link>
  </div></div></section></PageShell>;
}
