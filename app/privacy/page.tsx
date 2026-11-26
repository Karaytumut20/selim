import type { Metadata } from "next";
import { PageHero, PageShell } from "../../components/page-shell";
import { siteConfig } from "../../lib/site-config";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "How Global White Star LLC handles information for customer accounts, product offers, and direct orders.",
  path: "/privacy",
  noIndex: true,
});

export default function PrivacyPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow={siteConfig.name}
        title="Privacy Policy"
        index="Last updated November 26, 2026"
        intro="How we handle information when you browse the catalog, use a customer account, submit an offer, or contact sales."
      />
      <section className="content-section">
        <div className="container legal-prose">
          <h2>Information we collect</h2>
          <p>When you create a customer account, we use your email address and password to manage sign-in, email verification, and password recovery. When you submit an offer, we record the selected product, your offer amount, any note you add, and the offer status in your account.</p>
          <p>If you contact sales, the information you share may include your name, contact details, company, product requirements, delivery address, photos, and correspondence. If you place a direct order, we may also keep a record of the invoice, payment reference, delivery, and support history. Keep passwords, full payment card numbers, and online banking credentials out of messages and offer notes.</p>

          <h2>How we use information</h2>
          <p>We use information to operate customer accounts, review offers, reply to inquiries, confirm and fulfill orders, and handle delivery, returns, and support. We also use information to protect the website, investigate suspected misuse, and meet our recordkeeping and legal obligations.</p>

          <h2>Cookies and technical data</h2>
          <p>We use cookies to keep you signed in and complete password recovery. Your browser can block or clear these cookies. Account features may be unavailable when these cookies are blocked. Website and security logs may contain your IP address, browser information, pages requested, and request times.</p>

          <h2>Who handles information</h2>
          <p>Netlify hosts the website, Supabase manages customer authentication and stores offer records, and Brevo delivers account verification and password reset emails. Brevo may record email events such as delivery, opens, and link clicks. If you contact us by email or a messaging service, that service also handles the messages you send.</p>
          <p>We share the information needed to arrange delivery with carriers or other fulfillment providers. We may also disclose information when required by law or to protect our customers, business, or services.</p>

          <h2>Retention and privacy requests</h2>
          <p>How long we keep information depends on its purpose, the status of your account or order, and our legal and business recordkeeping needs. To ask about your information or request access, a correction, or deletion, email <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>. We may ask for information to verify your identity before responding.</p>

          <h2>Changes to this policy</h2>
          <p>We will post changes on this page and update the revision date.</p>
        </div>
      </section>
    </PageShell>
  );
}
