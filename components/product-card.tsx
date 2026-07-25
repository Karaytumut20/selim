import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { formatProductPrice, getCommerceDescription, hasProductPrice, resolveProductImage, type Product } from "../lib/products";
import { buildProductOrderUrl } from "../lib/whatsapp";
import { SiteImage } from "./site-image";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link className="product-card-image" href={`/products/${product.slug}`}>
        <SiteImage
          src={resolveProductImage(product.image)}
          alt={`${product.name} product photo`}
          width={1200}
          height={900}
          sizes="(max-width: 760px) 100vw, (max-width: 1080px) 50vw, 33vw"
        />
        <span className="image-index">GWS / PRODUCT / {product.partNumber}</span>
        <span className={`support-state ${product.repairSupported ? "supported" : "evaluation"}`}>{product.repairSupported ? "Available to order" : "Check availability"}</span>
      </Link>
      <div className="product-card-body">
        <div className="product-meta"><span>{product.manufacturerOrFamily}</span><span>{product.partNumber}</span></div>
        <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
        <p>{getCommerceDescription(product)}</p>
        <div className={`product-card-price ${hasProductPrice(product) ? "" : "quote"}`}><span>{hasProductPrice(product) ? "Price" : "Pricing"}</span><strong>{formatProductPrice(product)}</strong></div>
        <div className="product-card-actions">
          <Link href={`/products/${product.slug}`}>View product <ArrowUpRight /></Link>
          <a className="card-buy-button" href={buildProductOrderUrl(product)} target="_blank" rel="noopener noreferrer" aria-label={`${hasProductPrice(product) ? "Buy" : "Request a quote for"} ${product.name} through WhatsApp`}><MessageCircle /> {hasProductPrice(product) ? "Buy now" : "Request quote"}</a>
        </div>
      </div>
    </article>
  );
}
