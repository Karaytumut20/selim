export const siteConfig = {
  name: "Global White Star LLC",
  shortName: "Global White Star",
  tagline: "Reliable Products. Direct Purchasing.",
  description:
    "A practical product catalog for business and industrial buyers, with direct availability, pricing, and ordering support through WhatsApp.",
  url: "https://global-white-star-llc.umutkaraytu.chatgpt.site",
  phone: "+1 305 555 0147",
  phoneHref: "+13055550147",
  whatsappNumber: "13055550147",
  email: "sales@globalwhitestar.com",
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
  { label: "How to Order", href: "/repairs" },
  { label: "Solutions", href: "/industries" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;
