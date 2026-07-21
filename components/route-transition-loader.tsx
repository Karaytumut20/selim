"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SiteLoader } from "./site-loader";

const minimumVisibleTime = 280;
const maximumVisibleTime = 10000;

export function RouteTransitionLoader() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const startedAt = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  const hide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);

    const elapsed = Date.now() - startedAt.current;
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      document.documentElement.removeAttribute("aria-busy");
    }, Math.max(0, minimumVisibleTime - elapsed));
  }, []);

  const show = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);

    startedAt.current = Date.now();
    setVisible(true);
    document.documentElement.setAttribute("aria-busy", "true");
    safetyTimer.current = setTimeout(hide, maximumVisibleTime);
  }, [hide]);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    hide();
  }, [hide, pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (nextUrl.origin !== currentUrl.origin) return;
      if (nextUrl.pathname === currentUrl.pathname) return;

      show();
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", show);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", show);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      document.documentElement.removeAttribute("aria-busy");
    };
  }, [show]);

  return visible ? <SiteLoader transition /> : null;
}
