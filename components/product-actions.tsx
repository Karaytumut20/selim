"use client";

import { MessageCircle } from "lucide-react";
import type { Product } from "../lib/products";
import { buildProductRepairUrl } from "../lib/whatsapp";

export function ProductRepairLink({ product, className = "button button-primary", replacement = false }: { product: Product; className?: string; replacement?: boolean }) {
  return <a className={className} href={buildProductRepairUrl(product)} onClick={(event) => { event.currentTarget.href = buildProductRepairUrl(product, window.location.href); }} target="_blank" rel="noopener noreferrer" aria-label={`${replacement ? "Ask about replacement availability for" : "Request repair on WhatsApp for"} ${product.name}`}><MessageCircle /> {replacement ? "Ask About Replacement Availability" : "Request Repair on WhatsApp"}</a>;
}
