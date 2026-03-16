'use client'

import { usePathname } from 'next/navigation'

// Fades in page content on route changes using a CSS animation.
// CSS-based rather than framer-motion so it works even if JS hydration
// is delayed — the browser runs the animation natively without waiting
// for React to settle.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // The key prop forces React to unmount/remount this element on navigation,
  // which restarts the CSS animation on every page change.
  return (
    <main key={pathname} className="page-transition">
      {children}
    </main>
  )
}
