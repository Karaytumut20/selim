const salesPhone = process.env.NEXT_PUBLIC_SALES_PHONE?.trim() ?? "";
const salesPhoneDigits = salesPhone.replace(/\D/g, "");
const whatsappDigits = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

function publicSiteOrigin() {
  const fallback = "https://selim-k2se.vercel.app";
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? fallback);
    return url.protocol === "https:" ? url.origin : fallback;
  } catch {
    return fallback;
  }
}

export const siteConfig = {
  name: "Global White Star LLC",
  shortName: "Global White Star",
  tagline: "Business Technology. Direct Purchasing.",
  description:
    "Servers, memory, processors, monitors, storage, networking, and power products with direct availability, pricing, and ordering support.",
  url: publicSiteOrigin(),
  phone: /^[1-9]\d{6,14}$/.test(salesPhoneDigits) ? salesPhone : "",
  phoneHref: /^[1-9]\d{6,14}$/.test(salesPhoneDigits) ? `+${salesPhoneDigits}` : "",
  whatsappNumber: /^[1-9]\d{6,14}$/.test(whatsappDigits) ? whatsappDigits : "",
  email: process.env.NEXT_PUBLIC_SALES_EMAIL?.trim() || "sales@globalwhitestar.com",
  address: "Warehouse and collection details are confirmed with your order",
  serviceArea: "Nationwide product sourcing and delivery coordination",
  hours: "Sales support hours are confirmed when your message is received",
  location: "United States",
  schemaAreaServed: [
    { "@type": "AdministrativeArea", name: "Northeastern United States" },
    { "@type": "Country", name: "United States" },
  ],
  facts: {
    warranty: "Product-specific warranty information",
    turnaround: "Delivery timing confirmed before ordering",
    feasibility: "Availability confirmed by our sales team",
    testing: "Product details verified before dispatch",
  },
} as const;

export const navItems = [
  { label: "Products", href: "/products" },
  { label: "How to Order", href: "/how-to-order" },
  { label: "Solutions", href: "/industries" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "My Offers", href: "/account/offers" },
] as const;
