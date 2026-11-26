import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "../../../components/page-shell";
import { getAdminAccess } from "../../../lib/admin-auth";
import { signIn } from "./actions";

export const metadata: Metadata = {
  title: "Content Studio sign-in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if ((await getAdminAccess()).allowed) redirect("/admin");
  const { error } = await searchParams;
  const configured = Boolean(process.env.ADMIN_EMAILS?.trim() && process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);

  return (
    <PageShell>
      <section className="content-section">
        <div className="container">
          <h1>Content Studio sign-in</h1>
          {configured ? (
            <form className="admin-form-grid" action={signIn}>
              {error && <p role="alert">Unable to sign in with those credentials.</p>}
              <label>Email<input name="email" type="email" autoComplete="username" required /></label>
              <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
              <button className="button button-primary" type="submit">Sign in</button>
            </form>
          ) : <p>Admin access requires a configured Supabase project and administrator account.</p>}
        </div>
      </section>
    </PageShell>
  );
}
