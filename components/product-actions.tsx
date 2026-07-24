"use client";

import { MessageCircle } from "lucide-react";
import type { Product } from "../lib/products";
import { buildProductOrderUrl } from "../lib/whatsapp";

export function ProductOrderLink({ product, className = "button button-primary", compact = false }: { product: Product; className?: string; compact?: boolean }) {
  return <a className={className} href={buildProductOrderUrl(product)} onClick={(event) => { event.currentTarget.href = buildProductOrderUrl(product, window.location.href); }} target="_blank" rel="noopener noreferrer" aria-label={`Buy ${product.name} through WhatsApp`}><MessageCircle /> {compact ? "Buy Now" : "Buy via WhatsApp"}</a>;
}

export const ProductRepairLink = ProductOrderLink;
