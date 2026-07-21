"use client";

import { useState } from "react";
import { resolveProductImage } from "../lib/products";
import { SiteImage } from "./site-image";

export function ProductGallery({ name, gallery }: { name: string; gallery: string[] }) {
  const images = gallery.length ? gallery : ["control"];
  const [active, setActive] = useState(0);
  const activeImage = resolveProductImage(images[Math.min(active, images.length - 1)]);

  return <div className="product-gallery"><div className="product-gallery-main"><SiteImage src={activeImage} alt={`${name} technical view ${active + 1}`} width={1200} height={900} priority /><span>VIEW / {String(active + 1).padStart(2, "0")}</span></div><div className="gallery-thumbs">{images.map((image, index) => <button key={`${image}-${index}`} className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-label={`Show ${name} view ${index + 1}`}><SiteImage src={resolveProductImage(image)} alt="" width={240} height={180} /><span>{String(index + 1).padStart(2, "0")}</span></button>)}</div></div>;
}
