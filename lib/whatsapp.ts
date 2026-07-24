import { siteConfig } from "./site-config";
import type { Product } from "./products";

export const whatsappBase = `https://wa.me/${siteConfig.whatsappNumber}`;

export function buildWhatsAppUrl(message: string) {
  return `${whatsappBase}?text=${encodeURIComponent(message)}`;
}

export function buildGeneralOrderUrl() {
  return buildWhatsAppUrl(`Hello ${siteConfig.name},\n\nI would like to get information about a product and place an order.\n\nProduct name: \nProduct code: \nQuantity: \nDelivery location: \n\nPlease confirm current price, availability, and delivery details.`);
}

export function buildProductOrderUrl(product: Product, currentUrl?: string) {
  const productUrl = currentUrl || `${siteConfig.url}/products/${product.slug}`;
  return buildWhatsAppUrl(`Hello ${siteConfig.name},\n\nI would like to purchase the following product:\n\nProduct: ${product.name}\nProduct Code: ${product.partNumber}\nCategory: ${product.category}\nQuantity: 1\nProduct Page: ${productUrl}\n\nDelivery location:\n[City / State]\n\nPlease confirm current price, availability, and delivery details.`);
}

// Backward-compatible aliases for internal admin or older links.
export const buildGeneralRepairUrl = buildGeneralOrderUrl;
export const buildProductRepairUrl = buildProductOrderUrl;
