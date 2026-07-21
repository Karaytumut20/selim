"use client";

import { useState } from "react";
import { BoardVisual } from "./board-visual";

export function ProductGallery({ name, gallery }: { name: string; gallery: string[] }) {
  const [active, setActive] = useState(0);
  return <div className="product-gallery"><div className="product-gallery-main"><BoardVisual variant={gallery[active]} label={`${name} technical view ${active + 1}`} /><span>VIEW / {String(active + 1).padStart(2, "0")}</span></div><div className="gallery-thumbs">{gallery.map((variant, index) => <button key={`${variant}-${index}`} className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-label={`Show ${name} view ${index + 1}`}><BoardVisual variant={variant} label="" compact /><span>0{index + 1}</span></button>)}</div></div>;
}

