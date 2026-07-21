import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { resolveProductImage, type Product } from "../lib/products";
import { buildProductRepairUrl } from "../lib/whatsapp";
import { SiteImage } from "./site-image";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link className="product-card-image" href={`/products/${product.slug}`}>
        <SiteImage
          src={resolveProductImage(product.image)}
          alt={`${product.name} on an industrial electronics inspection bench`}
          width={1200}
          height={900}
          sizes="(max-width: 760px) 100vw, (max-width: 1080px) 50vw, 33vw"
        />
        <span className="image-index">NCW / CATALOG / {product.partNumber}</span>
        <span className={`support-state ${product.repairSupported ? "supported" : "evaluation"}`}>{product.repairSupported ? "Repair supported" : "Evaluation required"}</span>
      </Link>
      <div className="product-card-body">
        <div className="product-meta"><span>{product.manufacturerOrFamily}</span><span>{product.partNumber}</span></div>
        <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
        <p>{product.shortDescription}</p>
        <div className="product-card-actions">
          <Link href={`/products/${product.slug}`}>View details <ArrowRight /></Link>
          <a href={buildProductRepairUrl(product)} target="_blank" rel="noopener noreferrer" aria-label={`Request repair for ${product.name} on WhatsApp`}><MessageCircle /> Repair</a>
        </div>
      </div>
    </article>
  );
}
