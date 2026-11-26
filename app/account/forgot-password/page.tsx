import Link from "next/link";
import { OfferRecoveryForm } from "../../../components/offer-recovery-form";
import { PageShell } from "../../../components/page-shell";

export const metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <PageShell><section className="content-section"><div className="container"><div className="offer-panel">
    <h1>Forgot password?</h1>
    <p>Enter the email address you use for your customer account.</p>
    <OfferRecoveryForm />
    <Link href="/account/sign-in">Back to sign in</Link>
  </div></div></section></PageShell>;
}
