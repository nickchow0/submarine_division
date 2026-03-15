'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

// Renders as <main> so we don't add an extra wrapper div that could
// disrupt page layout — the animation sits on the element that already
// exists, not inside it.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <motion.main
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.main>
  )
}
