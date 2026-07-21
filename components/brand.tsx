import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand ${light ? "brand-light" : ""}`} href="/" aria-label="Northstar Circuit Works home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <b>NW</b>
      </span>
      <span className="brand-type">
        <strong>NORTHSTAR</strong>
        <small>CIRCUIT WORKS</small>
      </span>
    </Link>
  );
}

