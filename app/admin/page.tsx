import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminPanel } from "../../components/admin-panel";
import { adminSignInPath, getAdminAccess } from "../../lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content Studio",
  description: "Northstar Circuit Works internal product content workspace.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminPage() {
  const access = await getAdminAccess();
  if (access.configured && !access.user) redirect(adminSignInPath());
  if (access.configured && !access.allowed) notFound();
  return <AdminPanel viewerName={access.user?.displayName || "Local preview"} />;
}
