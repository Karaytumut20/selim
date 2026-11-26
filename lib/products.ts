export type Product = {
  id: string;
  slug: string;
  name: string;
  partNumber: string;
  manufacturerOrFamily: string;
  category: string;
  shortDescription: string;
  longDescription: string;
  price?: number;
  currency?: string;
  repairSupported: boolean;
  typicalFaults: string[];
  repairCapabilities: string[];
  leadTimeText: string;
  warrantyText: string;
  image: string;
  gallery: string[];
  specifications: Record<string, string>;
  relatedProductIds: string[];
  featured: boolean;
  primaryProduct: boolean;
};

export const products: Product[] = [
  {
    id: "server-2u24",
    slug: "proedge-2u24-rack-server",
    name: "ProEdge 2U24 Rack Server",
    partNumber: "SVR-2U24",
    manufacturerOrFamily: "ProEdge Server Series",
    category: "Servers",
    shortDescription: "A configurable 2U rack server for virtualization, storage, and business workloads.",
    longDescription: "A versatile dual-socket-ready 2U rack platform designed for virtualization, private cloud, database, and storage workloads. Memory, processor, drive, and network configurations are confirmed to match your requirement before ordering.",
    repairSupported: true,
    typicalFaults: ["2U rack form factor", "Up to 24 hot-swap drive bays", "Redundant power-ready design", "Remote management support"],
    repairCapabilities: ["Virtualization hosts", "Database workloads", "Private cloud", "Business applications"],
    leadTimeText: "Configuration and delivery confirmed before order",
    warrantyText: "Product-specific warranty confirmed with configuration",
    image: "server",
    gallery: ["server", "ram", "ssd"],
    specifications: { "Form factor": "2U rackmount", "Drive bays": "Up to 24 hot-swap bays", Memory: "DDR5 ECC platform", Network: "Configurable multi-gigabit" },
    relatedProductIds: ["ram-ecc-64", "ssd-u3-384", "switch-24g"],
    featured: true,
    primaryProduct: true,
  },
  {
    id: "server-1u12",
    slug: "coreline-1u12-rack-server",
    name: "CoreLine 1U12 Rack Server",
    partNumber: "SVR-1U12",
    manufacturerOrFamily: "CoreLine Server Series",
    category: "Servers",
    shortDescription: "Space-efficient rack server for web, network, and edge workloads.",
    longDescription: "A compact 1U rack server platform for web services, branch infrastructure, network applications, and edge deployments. Final CPU, memory, storage, and network options are selected with the sales team.",
    repairSupported: true,
    typicalFaults: ["Compact 1U chassis", "Hot-swap storage support", "ECC memory platform", "Remote administration ready"],
    repairCapabilities: ["Web hosting", "Network services", "Edge computing", "Branch infrastructure"],
    leadTimeText: "Configuration and delivery confirmed before order",
    warrantyText: "Product-specific warranty confirmed with configuration",
    image: "server",
    gallery: ["server", "ssd", "switch"],
    specifications: { "Form factor": "1U rackmount", Memory: "DDR5 ECC platform", Storage: "Configurable NVMe/SAS/SATA", Management: "Remote management ready" },
    relatedProductIds: ["server-2u24", "ram-ecc-64", "switch-24g"],
    featured: false,
    primaryProduct: false,
  },
  {
    id: "ram-ecc-64",
    slug: "ddr5-ecc-server-memory-64gb",
    name: "DDR5 ECC Server Memory 64GB",
    partNumber: "MEM-ECC64",
    manufacturerOrFamily: "Enterprise Memory",
    category: "Server Memory",
    shortDescription: "64GB ECC registered memory module for compatible enterprise servers.",
    longDescription: "A 64GB DDR5 ECC registered memory module intended for compatible server and workstation platforms. Server model, supported speed, rank, voltage, and population rules should be confirmed before ordering.",
    repairSupported: true,
    typicalFaults: ["64GB module capacity", "ECC error correction", "Registered DIMM design", "Server-grade validation"],
    repairCapabilities: ["Rack servers", "Tower servers", "Virtualization hosts", "Professional workstations"],
    leadTimeText: "Compatibility and delivery confirmed before order",
    warrantyText: "Product-specific warranty confirmed before order",
    image: "ram",
    gallery: ["ram", "server", "cpu"],
    specifications: { Capacity: "64GB", Type: "DDR5 ECC RDIMM", Application: "Compatible servers and workstations", Compatibility: "Confirmed by system model" },
    relatedProductIds: ["server-2u24", "ram-ecc-128", "cpu-ws16"],
    featured: true,
    primaryProduct: false,
  },
  {
    id: "ram-ecc-128",
    slug: "ddr5-ecc-server-memory-128gb-kit",
    name: "DDR5 ECC Server Memory 128GB Kit",
    partNumber: "MEM-ECC128K",
    manufacturerOrFamily: "Enterprise Memory",
    category: "Server Memory",
    shortDescription: "Matched 128GB ECC memory kit for high-density server workloads.",
    longDescription: "A matched DDR5 ECC registered memory kit for memory-intensive virtualization, analytics, database, and content workloads. Platform compatibility and memory population layout are confirmed before ordering.",
    repairSupported: true,
    typicalFaults: ["128GB matched kit", "ECC registered memory", "High-density workload ready", "Balanced server configuration"],
    repairCapabilities: ["Virtualization", "Databases", "Analytics", "Content production"],
    leadTimeText: "Compatibility and delivery confirmed before order",
    warrantyText: "Product-specific warranty confirmed before order",
    image: "ram",
    gallery: ["ram", "server", "cpu"],
    specifications: { Capacity: "128GB kit", Type: "DDR5 ECC RDIMM", Configuration: "Matched module kit", Compatibility: "Confirmed by system model" },
    relatedProductIds: ["ram-ecc-64", "server-2u24", "cpu-ws16"],
    featured: false,
    primaryProduct: false,
  },
  {
    id: "cpu-ws16",
    slug: "workstation-processor-16-core",
    name: "Workstation Processor 16-Core",
    partNumber: "CPU-WS16",
    manufacturerOrFamily: "Creator Compute",
    category: "Processors",
    shortDescription: "High-performance 16-core processor for professional workstation workloads.",
    longDescription: "A high-core-count processor for rendering, engineering, compiling, simulation, and demanding business applications. Socket, chipset, cooling, and memory compatibility are verified before ordering.",
    repairSupported: true,
    typicalFaults: ["16 processing cores", "Multi-threaded workload focus", "High-speed memory support", "Professional workstation class"],
    repairCapabilities: ["Rendering", "Engineering software", "Software development", "Data processing"],
    leadTimeText: "Compatibility and delivery confirmed before order",
    warrantyText: "Product-specific warranty confirmed before order",
    image: "cpu",
    gallery: ["cpu", "ram", "ssd"],
    specifications: { Cores: "16", Class: "Professional workstation", Cooling: "Sold separately unless specified", Compatibility: "Socket and chipset confirmed before order" },
    relatedProductIds: ["ram-ecc-128", "ssd-u3-384", "monitor-4k27"],
    featured: true,
    primaryProduct: false,
  },
  {
    id: "monitor-4k27",
    slug: "professional-4k-monitor-27-inch",
    name: "Professional 4K Monitor 27-inch",
    partNumber: "MON-4K27",
    manufacturerOrFamily: "ViewPro Displays",
    category: "Monitors",
    shortDescription: "27-inch 4K professional monitor with ergonomic stand and modern connectivity.",
    longDescription: "A sharp 27-inch 4K display for office, engineering, design, monitoring, and multi-screen workspaces. Connectivity, mounting, color, and ergonomic requirements can be confirmed before ordering.",
    repairSupported: true,
    typicalFaults: ["27-inch 4K panel", "Thin-bezel design", "Height-adjustable stand", "Modern digital connectivity"],
    repairCapabilities: ["Office productivity", "Design work", "Engineering", "Control-room displays"],
    leadTimeText: "Availability and delivery confirmed before order",
    warrantyText: "Product-specific warranty confirmed before order",
    image: "monitor",
    gallery: ["monitor", "cpu", "server"],
    specifications: { "Screen size": "27 inches", Resolution: "3840 × 2160", Mounting: "VESA-compatible", Stand: "Height, tilt, and swivel adjustment" },
    relatedProductIds: ["cpu-ws16", "ssd-u3-384", "server-1u12"],
    featured: true,
    primaryProduct: false,
  },
  {
    id: "ssd-u3-384",
    slug: "enterprise-nvme-ssd-3-84tb",
    name: "Enterprise NVMe SSD 3.84TB",
    partNumber: "SSD-U3-384",
    manufacturerOrFamily: "Enterprise Storage",
    category: "Storage",
    shortDescription: "High-endurance 3.84TB enterprise NVMe SSD for compatible servers.",
    longDescription: "A 3.84TB enterprise NVMe solid-state drive for data-intensive server, database, virtualization, and cache workloads. Interface, carrier, endurance profile, and platform support are confirmed before ordering.",
    repairSupported: true,
    typicalFaults: ["3.84TB capacity", "Enterprise NVMe interface", "High-endurance workload class", "Hot-swap platform ready"],
    repairCapabilities: ["Server storage", "Virtualization", "Databases", "High-speed cache tiers"],
    leadTimeText: "Compatibility and delivery confirmed before order",
    warrantyText: "Product-specific warranty confirmed before order",
    image: "ssd",
    gallery: ["ssd", "server", "ram"],
    specifications: { Capacity: "3.84TB", Interface: "Enterprise NVMe U.2/U.3 class", Workload: "Read-intensive / mixed-use options", Compatibility: "Confirmed by server model" },
    relatedProductIds: ["server-2u24", "ram-ecc-64", "cpu-ws16"],
    featured: true,
    primaryProduct: false,
  },
  {
    id: "switch-24g",
    slug: "managed-gigabit-switch-24-port",
    name: "Managed Gigabit Switch 24-Port",
    partNumber: "NET-SW24G",
    manufacturerOrFamily: "CoreNet Infrastructure",
    category: "Networking & Power",
    shortDescription: "Managed 24-port rackmount network switch for office and server environments.",
    longDescription: "A managed rackmount network switch for small business, office, server-room, and branch networks. Port speed, PoE needs, uplinks, management features, and rack requirements are confirmed before ordering.",
    repairSupported: true,
    typicalFaults: ["24 managed Ethernet ports", "Rackmount form factor", "Dedicated uplink support", "VLAN and monitoring features"],
    repairCapabilities: ["Business networks", "Server rooms", "IP devices", "Branch infrastructure"],
    leadTimeText: "Availability and delivery confirmed before order",
    warrantyText: "Product-specific warranty confirmed before order",
    image: "switch",
    gallery: ["switch", "server", "ups"],
    specifications: { Ports: "24 × Gigabit Ethernet", Uplinks: "Dedicated high-speed uplinks", Management: "Web/CLI-managed class", Mounting: "19-inch rack" },
    relatedProductIds: ["server-2u24", "ups-1500", "server-1u12"],
    featured: true,
    primaryProduct: false,
  },
  {
    id: "ups-1500",
    slug: "online-ups-1500va",
    name: "Online UPS 1500VA",
    partNumber: "PWR-UPS1500",
    manufacturerOrFamily: "SecurePower Systems",
    category: "Networking & Power",
    shortDescription: "1500VA online UPS for servers, network equipment, and business electronics.",
    longDescription: "A compact online UPS designed to protect servers, switches, storage, and other critical electronics from outages and unstable input power. Runtime, load, outlet, and management requirements are confirmed before ordering.",
    repairSupported: true,
    typicalFaults: ["1500VA capacity class", "Online power protection", "Status display", "Management-ready design"],
    repairCapabilities: ["Rack and tower servers", "Network switches", "Storage devices", "Office electronics"],
    leadTimeText: "Availability and delivery confirmed before order",
    warrantyText: "Product-specific warranty confirmed before order",
    image: "ups",
    gallery: ["ups", "switch", "server"],
    specifications: { Capacity: "1500VA class", Topology: "Online UPS", Display: "Front status display", Runtime: "Confirmed by connected load" },
    relatedProductIds: ["switch-24g", "server-1u12", "monitor-4k27"],
    featured: false,
    primaryProduct: false,
  },
];

export const categories = [
  "Servers",
  "Server Memory",
  "Processors",
  "Monitors",
  "Storage",
  "Networking & Power",
] as const;

export const primaryProduct = products.find((product) => product.primaryProduct)!;

export const productCardImages: Record<string, string> = {
  server: "/images/products/server-rack.png",
  ram: "/images/products/server-ram.png",
  cpu: "/images/products/processor.png",
  monitor: "/images/products/pro-monitor.png",
  ssd: "/images/products/enterprise-ssd.png",
  switch: "/images/products/network-switch.png",
  ups: "/images/products/ups.png",
};

export function resolveProductImage(image?: string) {
  if (!image) return productCardImages.server;
  return productCardImages[image] || image;
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getRelatedProducts(product: Product) {
  return product.relatedProductIds
    .map((id) => products.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Product => Boolean(candidate));
}

export function getCommerceDescription(product: Product) {
  return product.shortDescription;
}

export function hasProductPrice(product: Product) {
  return typeof product.price === "number" && Number.isFinite(product.price) && product.price >= 0;
}

export function formatProductPrice(product: Product) {
  if (!hasProductPrice(product)) return "Request a quote";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: product.currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(product.price!);
}

export function getProductHighlights(product: Product) {
  return product.typicalFaults;
}

export function getProductApplications(product: Product) {
  return product.repairCapabilities;
}

export function getCommerceSpecifications(product: Product) {
  return {
    ...product.specifications,
    Price: formatProductPrice(product),
    "Product code": product.partNumber,
    "Product family": product.manufacturerOrFamily,
    Category: product.category,
    Availability: product.repairSupported ? "Available for order inquiry" : "Confirmed on request",
    "Order method": "Contact sales",
  };
}
