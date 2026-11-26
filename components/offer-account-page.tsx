import Link from "next/link";
import { redirect } from "next/navigation";
import { getOfferCustomer, offerAccountsConfigured, offerAuthPath, offerReturnPath } from "../lib/offer-account";
import { OfferAccountForm } from "./offer-account-form";
import { PageShell } from "./page-shell";

export async function OfferAccountPage({ mode, next, passwordUpdated }: { mode: "sign-in" | "register"; next?: string; passwordUpdated?: boolean }) {
  const destination = offerReturnPath(next);
  if (await getOfferCustomer()) redirect(destination);
  const register = mode === "register";
  return <PageShell><section className="content-section"><div className="container">
    <div className="offer-panel">
      <h1>{register ? "Create an account" : "Sign in"}</h1>
      <p>{register ? "Create a customer account to submit an offer on a product." : "Sign in to submit an offer or view your previous offers."}</p>
      {passwordUpdated && <p role="status">Your password was updated. Sign in with your new password.</p>}
      {offerAccountsConfigured() ? <>
        <OfferAccountForm mode={mode} next={destination} />
        {!register && <p><Link href="/account/forgot-password">Forgot password?</Link></p>}
        <p>{register ? "Already have an account? " : "New customer? "}
          <Link href={offerAuthPath(register ? "sign-in" : "register", destination)}>{register ? "Sign in" : "Create an account"}</Link>
        </p>
      </> : <p role="status">Customer accounts are currently unavailable. Please try again later.</p>}
    </div>
  </div></section></PageShell>;
}
