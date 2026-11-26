import { siteConfig } from "./site-config";
import { formatProductPrice, type Product } from "./products";

function buildOrderMessageUrl(message: string) {
  if (siteConfig.whatsappNumber) return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
  return `mailto:${siteConfig.email}?subject=Product%20order%20inquiry&body=${encodeURIComponent(message)}`;
}

export function buildGeneralOrderUrl() {
  return buildOrderMessageUrl(`Hello ${siteConfig.name},\n\nI would like to get information about a product and place an order.\n\nProduct name: \nProduct code: \nQuantity: \nDelivery location: \n\nPlease confirm current price, availability, and delivery details.`);
}

export function buildProductOrderMessage(product: Product, currentUrl?: string) {
  const productUrl = currentUrl || `${siteConfig.url}/products/${product.slug}`;
  return `Hello ${siteConfig.name},\n\nI would like to purchase the following product:\n\nProduct: ${product.name}\nProduct Code: ${product.partNumber}\nCategory: ${product.category}\nPrice: ${formatProductPrice(product)}\nQuantity: 1\nProduct Page: ${productUrl}\n\nDelivery location:\n[City / State]\n\nPlease confirm current price, availability, and delivery details.`;
}

export function buildProductOrderUrl(product: Product, currentUrl?: string) {
  return buildOrderMessageUrl(buildProductOrderMessage(product, currentUrl));
}
