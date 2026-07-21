import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import type { Product } from "../lib/products";
import { buildProductRepairUrl } from "../lib/whatsapp";
import { BoardVisual } from "./board-visual";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link className="product-card-image" href={`/products/${product.slug}`}>
        <BoardVisual variant={product.image} label={`Technical illustration of ${product.name}`} compact />
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

