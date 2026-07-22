export const siteConfig = {
  name: "Global White Star LLC",
  shortName: "Global White Star",
  tagline: "Industrial Electronics, Restored With Precision.",
  description:
    "Northeast-focused industrial circuit board diagnostics and component-level repair for PLCs, drives, HMIs, and automation electronics nationwide.",
  url: "https://global-white-star-llc.umutkaraytu.chatgpt.site",
  phone: "+1 305 555 0147",
  phoneHref: "+13055550147",
  whatsappNumber: "13055550147",
  email: "service@globalwhitestar.com",
  address: "Service center address available with shipping instructions",
  serviceArea: "Northeast-focused service with nationwide shipping support",
  hours: "Service hours confirmed when your request is received",
  location: "United States",
  schemaAreaServed: [
    { "@type": "AdministrativeArea", name: "Northeastern United States" },
    { "@type": "Country", name: "United States" },
  ],
  facts: {
    warranty: "Warranty options available",
    turnaround: "Turnaround confirmed after evaluation",
    feasibility: "Repair feasibility is determined after inspection",
    testing: "Testing procedures vary by product type",
  },
} as const;

export const navItems = [
  { label: "Products", href: "/products" },
  { label: "Repair Services", href: "/repairs" },
  { label: "Industries", href: "/industries" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;
