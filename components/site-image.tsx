import NextImage, { type ImageProps } from "next/image";

/**
 * Project image primitive.
 *
 * vinext currently does not forward Next's global `images.unoptimized` option
 * to its client shim, so keep the prop explicit here as well. This prevents
 * local pages from calling the Cloudflare-only image optimization endpoint.
 */
export function SiteImage(props: ImageProps) {
  return <NextImage {...props} unoptimized />;
}
