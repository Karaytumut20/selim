import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ClipboardList, LayoutGrid, LogOut, Tags } from "lucide-react";
import { signOut } from "../app/admin/login/actions";
import { testCheckoutEnabled } from "../lib/customer-auth";

const links = [
  { href: "/admin", label: "Products", icon: LayoutGrid },
  { href: "/admin/offers", label: "Product offers", icon: Tags },
  { href: "/admin/test-orders", label: "Test orders", icon: ClipboardList },
] as const;

export function AdminShell({ activeHref, children }: { activeHref: (typeof links)[number]["href"]; children: ReactNode }) {
  const navigation = testCheckoutEnabled() ? links : links.slice(0, 2);

  return (
    <div className="admin-shell">
      <aside className="admin-rail">
        <Link className="admin-brand" href="/admin" aria-label="Global White Star Content Studio">
          <span aria-hidden="true">GWS</span>
          <div><strong>GLOBAL WHITE STAR</strong><small>CONTENT STUDIO</small></div>
        </Link>
        <nav aria-label="Admin navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={activeHref === href ? "page" : undefined} aria-label={label} title={label}>
              <Icon aria-hidden="true" /> <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-rail-actions">
          <Link href="/" aria-label="Return to website" title="Return to website"><ArrowLeft aria-hidden="true" /><span>Return to website</span></Link>
          <form action={signOut}>
            <button type="submit" aria-label="Sign out" title="Sign out"><LogOut aria-hidden="true" /><span>Sign out</span></button>
          </form>
        </div>
      </aside>
      <main className="admin-workspace">{children}</main>
    </div>
  );
}
