import { siteConfig } from "./site-config";
import type { Product } from "./products";

export const whatsappBase = `https://wa.me/${siteConfig.whatsappNumber}`;

export function buildWhatsAppUrl(message: string) {
  return `${whatsappBase}?text=${encodeURIComponent(message)}`;
}

export function buildGeneralRepairUrl() {
  return buildWhatsAppUrl(`Hello ${siteConfig.name},\n\nI would like to request an industrial electronics repair evaluation.\n\nProduct / board: \nPart number (if known): \nFault / symptoms: \n\nPlease let me know the next steps for evaluation and shipping.`);
}

export function buildProductRepairUrl(product: Product, currentUrl?: string) {
  const productUrl = currentUrl || `${siteConfig.url}/products/${product.slug}`;
  return buildWhatsAppUrl(`Hello ${siteConfig.name},\n\nI would like to request a repair evaluation for the following item:\n\nProduct: ${product.name}\nPart Number: ${product.partNumber}\nCategory: ${product.category}\nProduct Page: ${productUrl}\n\nFault / symptoms:\n[Please describe the issue]\n\nPlease let me know the next steps for evaluation and shipping.`);
}

