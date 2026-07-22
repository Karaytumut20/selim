import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RouteTransitionLoader } from "../components/route-transition-loader";
import { siteConfig } from "../lib/site-config";
import { defaultSocialImage } from "../lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: `${siteConfig.name} | Industrial Circuit Board Repair`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "industrial circuit board repair",
    "industrial electronic repair",
    "Northeast industrial circuit board repair",
    "mail-in industrial electronics repair",
    "PLC board repair",
    "servo drive board repair",
    "component-level PCB repair",
  ],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "Industrial electronics repair",
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: siteConfig.url, languages: { "en-US": siteConfig.url, "x-default": siteConfig.url } },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: { title: siteConfig.name, description: siteConfig.description, type: "website", locale: "en_US", url: siteConfig.url, siteName: siteConfig.name, images: [defaultSocialImage] },
  twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description, images: [defaultSocialImage.url] },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#111417" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RouteTransitionLoader />
        {children}
      </body>
    </html>
  );
}
