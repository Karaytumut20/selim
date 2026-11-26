import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminPanel } from "../../components/admin-panel";
import { testCheckoutEnabled } from "../../lib/customer-auth";
import { signOut } from "./login/actions";
import { adminSignInPath, getAdminAccess } from "../../lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content Studio",
  description: "Global White Star LLC internal product content workspace.",
  alternates: { canonical: "/admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminPage() {
  const access = await getAdminAccess();
  if (!access.user) redirect(adminSignInPath());
  if (!access.allowed) notFound();
  return <>
    <form action={signOut}><button className="button button-secondary" type="submit">Sign out</button></form>
    <Link className="button button-outline" href="/admin/offers">Product offers</Link>
    {testCheckoutEnabled() && <Link className="button button-secondary" href="/admin/test-orders">Test orders</Link>}
    <AdminPanel viewerName={access.user.displayName} />
  </>;
}
