import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand ${light ? "brand-light" : ""}`} href="/" aria-label="Global White Star LLC home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <b>GWS</b>
      </span>
      <span className="brand-type">
        <strong>GLOBAL WHITE STAR</strong>
        <small>LLC</small>
      </span>
    </Link>
  );
}

