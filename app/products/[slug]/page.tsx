import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, FileText, Info, PackageCheck, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { PageShell, SectionHeading } from "../../../components/page-shell";
import { ProductRepairLink } from "../../../components/product-actions";
import { ProductGallery } from "../../../components/product-gallery";
import { ProductCard } from "../../../components/product-card";
import { JsonLd } from "../../../components/json-ld";
import { getPublishedProduct, getPublishedProducts, getRelatedProductsFromList } from "../../../lib/catalog";
import { products, resolveProductImage } from "../../../lib/products";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata, truncateMetaDescription } from "../../../lib/seo";
import { siteConfig } from "../../../lib/site-config";

export function generateStaticParams() { return products.map((product) => ({ slug: product.slug })); }

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) return pageMetadata({ title: "Product Not Found", description: "The requested repair catalog record is not available.", path: `/products/${slug}`, noIndex: true });
  const description = truncateMetaDescription(`${product.shortDescription} Request a component-level repair evaluation for ${product.partNumber}.`);
  return pageMetadata({
    title: `${product.name} Repair`,
    description,
    path: `/products/${product.slug}`,
    image: { url: absoluteUrl(resolveProductImage(product.image)), width: 1200, height: 900, alt: `${product.name} industrial circuit board` },
  });
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) notFound();
  const catalog = await getPublishedProducts();
  const related = getRelatedProductsFromList(product, catalog);
  const productUrl = `${siteConfig.url}/products/${product.slug}`;
  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Products", path: "/products" },
    { name: product.name, path: `/products/${product.slug}` },
  ]);
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${productUrl}/#repair-service`,
    name: `${product.name} Repair Evaluation`,
    description: product.longDescription,
    url: productUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": productUrl },
    serviceType: "Industrial circuit board repair evaluation",
    category: product.category,
    identifier: product.partNumber,
    image: product.gallery.map((image) => absoluteUrl(resolveProductImage(image))),
    provider: { "@id": `${siteConfig.url}/#organization`, name: siteConfig.name, url: siteConfig.url },
    areaServed: siteConfig.schemaAreaServed,
  };

  return <PageShell>
    <JsonLd data={[breadcrumbSchema, serviceSchema]} />
    <section className="product-detail-head"><div className="container"><div className="breadcrumbs"><Link href="/">Home</Link><span><Link href="/products">Products</Link></span><span>{product.partNumber}</span></div><div className="product-detail-grid">
      <ProductGallery name={product.name} gallery={product.gallery} />
      <div className="product-summary"><span className="eyebrow">{product.category}</span><div className="product-part">PART NUMBER / <strong>{product.partNumber}</strong></div><h1>{product.name}</h1><p className="product-family">{product.manufacturerOrFamily}</p><span className={`repair-supported ${product.repairSupported ? "" : "evaluation-badge"}`}><i /> {product.repairSupported ? "Repair Supported" : "Evaluation Required"}</span><p className="product-intro">{product.longDescription}</p><div className="summary-facts"><div><span>Turnaround</span><strong>{product.leadTimeText}</strong></div><div><span>Warranty</span><strong>{product.warrantyText}</strong></div></div><ProductRepairLink product={product} /> <ProductRepairLink product={product} replacement className="replacement-link" /></div>
    </div></div></section>

    <section className="product-information content-section"><div className="container product-info-layout"><div className="product-info-main">
      <section><SectionHeading eyebrow="Product overview" title="What the evaluation can address." /><p className="prose-lead">{product.longDescription}</p></section>
      <section><div className="product-two-column"><div><h2>Typical failure symptoms</h2><ul className="check-list">{product.typicalFaults.map((item) => <li key={item}>{item}</li>)}</ul><p className="qualification"><Info /> Reported symptoms do not automatically confirm the root cause.</p></div><div><h2>Repair capabilities</h2><ul className="check-list">{product.repairCapabilities.map((item) => <li key={item}>{item}</li>)}</ul><p className="qualification"><Info /> Final capability is qualified after physical inspection.</p></div></div></section>
      <section><h2>Evaluation process</h2><div className="compact-steps">{[[ClipboardCheck, "Identify", "Confirm labels, application, and reported fault."], [FileText, "Evaluate", "Inspect the board and define a testable repair scope."], [CheckCircle2, "Approve", "Review the quotation before work begins."], [ShieldCheck, "Repair & test", "Complete approved work and product-appropriate checks."]].map(([Icon, title, copy], index) => { const C = Icon as typeof ShieldCheck; return <article key={String(title)}><span>0{index + 1}</span><C /><h3>{String(title)}</h3><p>{String(copy)}</p></article>; })}</div></section>
      <section><div className="product-two-column"><div><h2>What to send</h2><ul className="check-list">{["Board and enclosure photos", "All labels and part numbers", "Machine or system identity", "Fault symptoms and error codes", "Previous repair history, if known"].map((item) => <li key={item}>{item}</li>)}</ul></div><div><h2>Testing approach</h2><p>Testing is adapted to the board class, failure mode, available documentation, safe energization, and available equipment. A repaired assembly may be tested at circuit, functional, or interface level as the confirmed scope permits.</p><div className="quality-note"><PackageCheck /><div><strong>Return packaging guidance</strong><span>Provided before shipment when an evaluation proceeds.</span></div></div></div></div></section>
      <section><h2>Catalog record</h2><dl className="spec-table">{Object.entries(product.specifications).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section>
    </div><aside className="repair-aside"><span className="eyebrow">Repair desk</span><h2>Request an evaluation for {product.partNumber}.</h2><p>Share the symptoms and photos. The message includes the product identity and this page URL.</p><ProductRepairLink product={product} /><small>No account, cart, or online payment required.</small></aside></div></section>

    {related.length > 0 && <section className="content-section cream-section"><div className="container"><SectionHeading eyebrow="Related repair records" title="Boards in adjacent control families." /><div className="product-grid">{related.map((item) => <ProductCard product={item} key={item.id} />)}</div><div className="section-end-link"><Link href="/products">Browse complete catalog <ArrowRight /></Link></div></div></section>}
    <div className="mobile-product-cta"><div><span>{product.partNumber}</span><strong>{product.name}</strong></div><ProductRepairLink product={product} className="button button-primary" /></div>
  </PageShell>;
}
