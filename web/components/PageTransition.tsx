"use client";

import { usePathname } from "next/navigation";

// Fades in page content on route changes using a CSS animation.
// CSS-based rather than framer-motion so it works even if JS hydration
// is delayed — the browser runs the animation natively without waiting
// for React to settle.
export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // When navigating from /gallery to /photo/[id], Next.js opens a modal overlay
  // via the @modal intercepting route. In that case we don't want to re-animate
  // the background page — the gallery should stay mounted silently behind the
  // modal backdrop. Grouping gallery and photo routes under the same key achieves
  // this: React sees no key change, so it doesn't unmount/remount the <main>.
  const transitionKey =
    pathname.startsWith("/gallery") || pathname.startsWith("/photo/")
      ? "/gallery"
      : pathname;

  return (
    <main key={transitionKey} className="page-transition">
      {children}
    </main>
  );
}
