"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SiteLoader } from "./site-loader";

const MINIMUM_VISIBLE_MS = 240;
const SAFETY_TIMEOUT_MS = 8000;

function RouteTransitionLoaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = `${pathname}?${searchParams.toString()}`;
  const previousPath = useRef(currentPath);

  const startedAt = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const hide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);

    // 1. Force scroll to top while loader screen covers the browser viewport
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const elapsed = Date.now() - startedAt.current;
    const remainingTime = Math.max(0, MINIMUM_VISIBLE_MS - elapsed);

    hideTimer.current = setTimeout(() => {
      // 2. Trigger smooth fade-out and scale-up exit animation
      setLeaving(true);

      leaveTimer.current = setTimeout(() => {
        setVisible(false);
        setLeaving(false);
        document.documentElement.removeAttribute("aria-busy");
      }, 220);
    }, remainingTime);
  }, []);

  const show = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);

    startedAt.current = Date.now();
    setLeaving(false);
    setVisible(true);
    document.documentElement.setAttribute("aria-busy", "true");

    safetyTimer.current = setTimeout(hide, SAFETY_TIMEOUT_MS);
  }, [hide]);

  useEffect(() => {
    if (previousPath.current === currentPath) return;
    previousPath.current = currentPath;
    hide();
  }, [currentPath, hide]);

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
      // Skip if clicking the exact same URL anchor hash on current page
      if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) return;

      show();
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", show);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", show);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      document.documentElement.removeAttribute("aria-busy");
    };
  }, [show]);

  return visible ? <SiteLoader transition leaving={leaving} /> : null;
}

export function RouteTransitionLoader() {
  return (
    <Suspense fallback={null}>
      <RouteTransitionLoaderInner />
    </Suspense>
  );
}
