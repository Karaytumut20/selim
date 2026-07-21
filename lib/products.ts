export type Product = {
  id: string;
  slug: string;
  name: string;
  partNumber: string;
  manufacturerOrFamily: string;
  category: string;
  shortDescription: string;
  longDescription: string;
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

// Replaceable demonstration catalog. The AXC-900 record is the temporary primary product.
export const products: Product[] = [
  {
    id: "axc-900",
    slug: "axc-900-industrial-control-board",
    name: "AXC-900 Industrial Control Board",
    partNumber: "AXC-900",
    manufacturerOrFamily: "A Series",
    category: "Industrial Control PCB",
    shortDescription: "Multi-zone machine control board supported for inspection and component-level repair evaluation.",
    longDescription: "The temporary flagship board in the Northstar catalog. Evaluation can cover power regulation, field I/O, communications, damaged traces, connectors, and board-level control circuits where test access and documentation permit.",
    repairSupported: true,
    typicalFaults: ["No power", "Intermittent operation", "Communication failure", "Burnt components"],
    repairCapabilities: ["Power rail analysis", "Trace and pad repair", "Connector replacement", "Controlled functional testing"],
    leadTimeText: "Turnaround confirmed after evaluation",
    warrantyText: "Warranty options available after repair scope is confirmed",
    image: "control",
    gallery: ["control", "inspection", "power"],
    specifications: { "Board class": "Industrial control PCB", "Service level": "Component-level evaluation", "Catalog status": "Temporary demo record" },
    relatedProductIds: ["a-440", "c-220", "p-310"],
    featured: true,
    primaryProduct: true,
  },
  {
    id: "a-440", slug: "a-440-machine-control-pcb", name: "A-440 Machine Control PCB", partNumber: "A-440", manufacturerOrFamily: "A Series", category: "Industrial Control Boards", shortDescription: "General machine sequence and I/O control board.", longDescription: "A generic demonstration control board record for machine control repair inquiries and initial feasibility review.", repairSupported: true, typicalFaults: ["Output failure", "Failed relays", "Intermittent operation"], repairCapabilities: ["Relay replacement", "I/O section diagnostics", "Solder rework"], leadTimeText: "Turnaround confirmed after evaluation", warrantyText: "Warranty options available", image: "control", gallery: ["control", "inspection"], specifications: { "Product family": "A Series", "Service": "Repair evaluation" }, relatedProductIds: ["axc-900", "c-220"], featured: true, primaryProduct: false,
  },
  {
    id: "c-220", slug: "c-220-plc-communication-board", name: "C-220 PLC Communication Board", partNumber: "C-220", manufacturerOrFamily: "C Series", category: "PLC and I/O Boards", shortDescription: "Industrial network and PLC interface board.", longDescription: "Generic PLC communication board used to demonstrate identification, evaluation, and repair request workflows.", repairSupported: true, typicalFaults: ["Communication failure", "Error codes", "Damaged connectors"], repairCapabilities: ["Interface inspection", "Connector replacement", "Power rail analysis"], leadTimeText: "Turnaround confirmed after evaluation", warrantyText: "Warranty options available", image: "comms", gallery: ["comms", "inspection"], specifications: { "Product family": "C Series", "Board class": "PLC communications" }, relatedProductIds: ["a-440", "m-610"], featured: true, primaryProduct: false,
  },
  {
    id: "s-760", slug: "s-760-servo-drive-control-board", name: "S-760 Servo Drive Control Board", partNumber: "S-760", manufacturerOrFamily: "S Series", category: "Servo and Drive Boards", shortDescription: "Servo control electronics for motion applications.", longDescription: "Generic servo drive control board for repair evaluation. Root cause and safe test scope depend on the associated drive and available technical information.", repairSupported: true, typicalFaults: ["No power", "Overheating", "Output failure"], repairCapabilities: ["Gate drive inspection", "Thermal inspection", "Power component evaluation"], leadTimeText: "Turnaround confirmed after evaluation", warrantyText: "Warranty options available", image: "drive", gallery: ["drive", "power"], specifications: { "Product family": "S Series", "Board class": "Servo drive control" }, relatedProductIds: ["s-420", "p-310"], featured: true, primaryProduct: false,
  },
  {
    id: "h-180", slug: "h-180-hmi-main-logic-board", name: "H-180 HMI Main Logic Board", partNumber: "H-180", manufacturerOrFamily: "H Series", category: "HMI and Operator Panels", shortDescription: "Main logic board for industrial operator interfaces.", longDescription: "Generic HMI logic board for screen, boot, input, and communication related evaluation.", repairSupported: true, typicalFaults: ["Display failure", "No boot", "Communication failure"], repairCapabilities: ["Power section diagnosis", "Connector inspection", "Interface circuit service"], leadTimeText: "Turnaround confirmed after evaluation", warrantyText: "Warranty options available", image: "hmi", gallery: ["hmi", "inspection"], specifications: { "Product family": "H Series", "Board class": "HMI logic" }, relatedProductIds: ["h-240", "c-220"], featured: true, primaryProduct: false,
  },
  {
    id: "p-310", slug: "p-310-industrial-power-supply-pcb", name: "P-310 Industrial Power Supply PCB", partNumber: "P-310", manufacturerOrFamily: "P Series", category: "Power Supply Boards", shortDescription: "Regulated industrial power conversion board.", longDescription: "Generic industrial power supply PCB for inspection of startup, regulation, thermal, and output-stage faults.", repairSupported: true, typicalFaults: ["No power", "Unstable voltage rails", "Overheating"], repairCapabilities: ["Power rail analysis", "Capacitor service", "Thermal inspection"], leadTimeText: "Turnaround confirmed after evaluation", warrantyText: "Warranty options available", image: "power", gallery: ["power", "inspection"], specifications: { "Product family": "P Series", "Board class": "Power supply" }, relatedProductIds: ["s-760", "axc-900"], featured: true, primaryProduct: false,
  },
  {
    id: "m-610", slug: "m-610-cnc-interface-board", name: "M-610 CNC Interface Board", partNumber: "M-610", manufacturerOrFamily: "M Series", category: "CNC and Machine Control Boards", shortDescription: "Machine interface board for CNC control systems.", longDescription: "Generic CNC interface record for isolating I/O, communication, connector, and power distribution faults.", repairSupported: true, typicalFaults: ["I/O failure", "Communication failure", "Damaged connectors"], repairCapabilities: ["I/O diagnostics", "Trace repair", "Connector replacement"], leadTimeText: "Turnaround confirmed after evaluation", warrantyText: "Warranty options available", image: "cnc", gallery: ["cnc", "inspection"], specifications: { "Product family": "M Series", "Board class": "CNC interface" }, relatedProductIds: ["c-220", "a-440"], featured: false, primaryProduct: false,
  },
  {
    id: "a-520", slug: "a-520-process-control-board", name: "A-520 Process Control Board", partNumber: "A-520", manufacturerOrFamily: "A Series", category: "Industrial Control Boards", shortDescription: "Process control PCB with mixed analog and digital I/O.", longDescription: "Generic process board record for component-level repair evaluation.", repairSupported: true, typicalFaults: ["Unstable inputs", "Intermittent operation", "Output failure"], repairCapabilities: ["Analog section diagnostics", "Solder rework", "Contamination removal"], leadTimeText: "Turnaround confirmed after evaluation", warrantyText: "Warranty options available", image: "control", gallery: ["control", "inspection"], specifications: { "Product family": "A Series", "Board class": "Process control" }, relatedProductIds: ["axc-900", "a-440"], featured: false, primaryProduct: false,
  },
  {
    id: "c-340", slug: "c-340-remote-io-board", name: "C-340 Remote I/O Board", partNumber: "C-340", manufacturerOrFamily: "C Series", category: "PLC and I/O Boards", shortDescription: "Distributed industrial input and output board.", longDescription: "Generic remote I/O board record used for repair qualification and request capture.", repairSupported: true, typicalFaults: ["Channel failure", "Bus fault", "No power"], repairCapabilities: ["Channel diagnostics", "Interface inspection", "Connector service"], leadTimeText: "Turnaround confirmed after evaluation", warrantyText: "Warranty options available", image: "comms", gallery: ["comms", "control"], specifications: { "Product family": "C Series", "Board class": "Remote I/O" }, relatedProductIds: ["c-220", "a-440"], featured: false, primaryProduct: false,
  },
  {
    id: "s-420", slug: "s-420-drive-interface-board", name: "S-420 Drive Interface Board", partNumber: "S-420", manufacturerOrFamily: "S Series", category: "Servo and Drive Boards", shortDescription: "Drive interface and feedback processing electronics.", longDescription: "Generic drive interface board for connector, feedback, power, and communication fault evaluation.", repairSupported: true, typicalFaults: ["Feedback error", "Communication failure", "Overheating"], repairCapabilities: ["Signal path inspection", "Thermal inspection", "Solder rework"], leadTimeText: "Turnaround confirmed after evaluation", warrantyText: "Warranty options available", image: "drive", gallery: ["drive", "comms"], specifications: { "Product family": "S Series", "Board class": "Drive interface" }, relatedProductIds: ["s-760", "p-310"], featured: false, primaryProduct: false,
  },
  {
    id: "h-240", slug: "h-240-operator-panel-controller", name: "H-240 Operator Panel Controller", partNumber: "H-240", manufacturerOrFamily: "H Series", category: "HMI and Operator Panels", shortDescription: "Operator panel controller and display interface board.", longDescription: "Generic operator panel control board for display, touch, boot, and communication issue evaluation.", repairSupported: true, typicalFaults: ["Blank display", "Touch input failure", "No boot"], repairCapabilities: ["Power inspection", "Display interface checks", "Connector service"], leadTimeText: "Turnaround confirmed after evaluation", warrantyText: "Warranty options available", image: "hmi", gallery: ["hmi", "comms"], specifications: { "Product family": "H Series", "Board class": "Operator panel" }, relatedProductIds: ["h-180", "c-220"], featured: false, primaryProduct: false,
  },
  {
    id: "p-480", slug: "p-480-dc-power-regulation-board", name: "P-480 DC Power Regulation Board", partNumber: "P-480", manufacturerOrFamily: "P Series", category: "Power Supply Boards", shortDescription: "DC regulation and distribution PCB.", longDescription: "Generic DC power board record for regulation and protection circuit evaluation.", repairSupported: true, typicalFaults: ["Low output", "Unstable voltage", "Burnt components"], repairCapabilities: ["Rail measurement", "Capacitor service", "Protection circuit inspection"], leadTimeText: "Turnaround confirmed after evaluation", warrantyText: "Warranty options available", image: "power", gallery: ["power", "inspection"], specifications: { "Product family": "P Series", "Board class": "DC regulation" }, relatedProductIds: ["p-310", "s-760"], featured: false, primaryProduct: false,
  },
  {
    id: "m-720", slug: "m-720-cnc-axis-control-board", name: "M-720 CNC Axis Control Board", partNumber: "M-720", manufacturerOrFamily: "M Series", category: "CNC and Machine Control Boards", shortDescription: "Axis control electronics for CNC motion systems.", longDescription: "Generic CNC axis control board for preliminary repair feasibility evaluation.", repairSupported: false, typicalFaults: ["Axis error", "Output failure", "Intermittent operation"], repairCapabilities: ["Inspection available", "Repair scope confirmed after evaluation"], leadTimeText: "Evaluation required before repair support is confirmed", warrantyText: "Warranty terms depend on confirmed scope", image: "cnc", gallery: ["cnc", "drive"], specifications: { "Product family": "M Series", "Board class": "Axis control" }, relatedProductIds: ["m-610", "s-420"], featured: false, primaryProduct: false,
  },
  {
    id: "i-115", slug: "i-115-industrial-relay-board", name: "I-115 Industrial Relay Board", partNumber: "I-115", manufacturerOrFamily: "I Series", category: "Industrial Control Boards", shortDescription: "Multi-channel relay output control PCB.", longDescription: "Generic relay board for contact, coil drive, trace, and connector evaluation.", repairSupported: true, typicalFaults: ["Failed relays", "Stuck output", "Burnt traces"], repairCapabilities: ["Relay replacement", "Driver circuit checks", "Trace repair"], leadTimeText: "Turnaround confirmed after evaluation", warrantyText: "Warranty options available", image: "control", gallery: ["control", "power"], specifications: { "Product family": "I Series", "Board class": "Relay output" }, relatedProductIds: ["a-440", "a-520"], featured: false, primaryProduct: false,
  },
];

export const categories = [
  "Industrial Control Boards",
  "PLC and I/O Boards",
  "Servo and Drive Boards",
  "HMI and Operator Panels",
  "Power Supply Boards",
  "CNC and Machine Control Boards",
] as const;

export const primaryProduct = products.find((product) => product.primaryProduct)!;

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getRelatedProducts(product: Product) {
  return product.relatedProductIds
    .map((id) => products.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Product => Boolean(candidate));
}

