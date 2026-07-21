import type { Metadata } from "next";
import { AdminPanel } from "../../components/admin-panel";

export const metadata: Metadata = {
  title: "Content Studio",
  description: "Northstar Circuit Works internal product content workspace.",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return <AdminPanel />;
}

