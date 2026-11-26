import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminPanel } from "../../components/admin-panel";
import { AdminShell } from "../../components/admin-shell";
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
  return <AdminShell activeHref="/admin">
    <AdminPanel viewerName={access.user.displayName} />
  </AdminShell>;
}
