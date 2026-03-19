'use client'

// ─── BuyPrintButton ──────────────────────────────────────────────────────────
// Renders a Shopify Buy Button SDK component for a given product ID.
// The SDK is browser-only — this file must be loaded with:
//   dynamic(() => import('./BuyPrintButton'), { ssr: false })
//
// Cleanup: component.destroy() is called on unmount to prevent orphaned SDK
// instances when the modal navigates between photos.

import { useEffect, useRef } from 'react'

type Props = {
  shopifyProductId: string
}

export default function BuyPrintButton({ shopifyProductId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let component: { destroy(): void } | null = null

    async function init() {
      // Dynamic import keeps this out of the server bundle
      const ShopifyBuy = (await import('@shopify/buy-button-js')).default

      const client = ShopifyBuy.buildClient({
        domain: process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!,
        storefrontAccessToken: process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN!,
      })

      const ui = ShopifyBuy.UI.init(client)

      component = ui.createComponent('product', {
        id: shopifyProductId,
        node: containerRef.current,
        options: {
          product: {
            buttonDestination: 'checkout',
            text: { button: 'Buy Print' },
          },
        },
      })
    }

    if (containerRef.current) {
      init().catch(console.error)
    }

    return () => {
      component?.destroy()
    }
  }, [shopifyProductId])

  return <div ref={containerRef} />
}
