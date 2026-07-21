import type { Metadata } from "next";
import { siteConfig } from "./site-config";

export const defaultSocialImage = {
  url: `${siteConfig.url}/og.png`,
  width: 1200,
  height: 630,
  alt: `${siteConfig.name} industrial circuit board repair`,
};

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export function pageMetadata({
  title,
  description,
  path,
  image = defaultSocialImage,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: { url: string; width?: number; height?: number; alt: string };
  noIndex?: boolean;
}): Metadata {
  const canonical = absoluteUrl(path);
  const socialTitle = `${title} | ${siteConfig.name}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { "en-US": canonical, "x-default": canonical },
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      siteName: siteConfig.name,
      title: socialTitle,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image.url],
    },
    robots: noIndex ? { index: false, follow: false, nocache: true } : undefined,
  };
}

export function truncateMetaDescription(value: string, maxLength = 158) {
  if (value.length <= maxLength) return value;
  const shortened = value.slice(0, maxLength - 1).replace(/\s+\S*$/, "").trim();
  return `${shortened}…`;
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
