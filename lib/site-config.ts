export const siteConfig = {
  name: "Northstar Circuit Works",
  shortName: "Northstar",
  tagline: "Industrial Electronics, Restored With Precision.",
  description:
    "Component-level diagnostics and repair for industrial circuit boards, PLC electronics, drive boards, HMI controls, and automation systems across the United States.",
  url: "https://northstar-circuit-works.example",
  phone: "+1 305 555 0147",
  phoneHref: "+13055550147",
  whatsappNumber: "13055550147",
  email: "service@northstarcircuit.com",
  address: "Service center address available with shipping instructions",
  serviceArea: "Nationwide service across the United States",
  hours: "Service hours confirmed when your request is received",
  location: "United States",
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

