import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "../../../components/page-shell";
import { getCustomerUser, testCheckoutEnabled } from "../../../lib/customer-auth";
import { signInTestCustomer } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Test store sign-in", robots: { index: false, follow: false } };

export default async function TestCustomerLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!testCheckoutEnabled() || await getCustomerUser()) redirect("/checkout");
  const { error } = await searchParams;
  return <PageShell><section className="content-section"><div className="container">
    <h1>Test store sign-in</h1>
    <p>Sign in with the configured Supabase test customer account.</p>
    <form className="admin-form-grid" action={signInTestCustomer}>
      {error && <p role="alert" className="admin-form-wide">The test account could not sign in.</p>}
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      <div className="admin-form-wide"><button className="button button-primary" type="submit">Sign in</button></div>
    </form>
  </div></section></PageShell>;
}
