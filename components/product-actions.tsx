"use client";

import { Copy, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { hasProductPrice, type Product } from "../lib/products";
import { siteConfig } from "../lib/site-config";
import { buildProductOrderMessage, buildProductOrderUrl } from "../lib/whatsapp";

export function ProductOrderLink({ product, className = "button button-primary", compact = false }: { product: Product; className?: string; compact?: boolean }) {
  const priced = hasProductPrice(product);
  return <a className={className} href={buildProductOrderUrl(product)} onClick={(event) => { event.currentTarget.href = buildProductOrderUrl(product, window.location.href); }} target="_blank" rel="noopener noreferrer" aria-label={`${priced ? "Contact sales to order" : "Request a quote for"} ${product.name}`}><MessageCircle /> {priced ? (compact ? "Contact sales" : "Contact sales to order") : "Request a quote"}</a>;
}

export function ProductOrderCopyActions({ product }: { product: Product }) {
  const [feedback, setFeedback] = useState<{ message: string; manualText?: string }>();

  async function copy(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback({ message: successMessage });
    } catch {
      setFeedback({ message: "Select and copy the text below.", manualText: text });
    }
  }

  return (
    <div className="order-copy">
      <div className="offer-actions">
        <button type="button" className="button button-outline" onClick={() => void copy(siteConfig.email, "Sales email copied.")}>
          <Mail aria-hidden="true" /> Copy email
        </button>
        <button type="button" className="button button-outline" onClick={() => {
          const productUrl = window.location.origin + window.location.pathname;
          void copy(buildProductOrderMessage(product, productUrl), "Order details copied.");
        }}>
          <Copy aria-hidden="true" /> Copy order details
        </button>
      </div>
      <div className="order-copy-feedback" role="status">{feedback?.message}</div>
      {feedback?.manualText && (
        <textarea aria-label="Text to copy" readOnly rows={5} value={feedback.manualText} />
      )}
    </div>
  );
}
