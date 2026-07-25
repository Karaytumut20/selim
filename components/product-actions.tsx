"use client";

import { MessageCircle } from "lucide-react";
import { hasProductPrice, type Product } from "../lib/products";
import { buildProductOrderUrl } from "../lib/whatsapp";

export function ProductOrderLink({ product, className = "button button-primary", compact = false }: { product: Product; className?: string; compact?: boolean }) {
  const priced = hasProductPrice(product);
  return <a className={className} href={buildProductOrderUrl(product)} onClick={(event) => { event.currentTarget.href = buildProductOrderUrl(product, window.location.href); }} target="_blank" rel="noopener noreferrer" aria-label={`${priced ? "Buy" : "Request a quote for"} ${product.name} through WhatsApp`}><MessageCircle /> {compact ? (priced ? "Buy Now" : "Get Quote") : (priced ? "Buy via WhatsApp" : "Request a quote")}</a>;
}
