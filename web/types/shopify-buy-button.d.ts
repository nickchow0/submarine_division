declare module '@shopify/buy-button-js' {
  interface BuildClientConfig {
    domain: string
    storefrontAccessToken: string
  }
  interface ProductOptions {
    buttonDestination?: string
    text?: { button?: string }
  }
  interface CreateComponentOptions {
    id: string
    node: HTMLElement | null
    options?: { product?: ProductOptions }
  }
  interface Component {
    destroy(): void
  }
  interface UI {
    createComponent(type: string, options: CreateComponentOptions): Component
  }
  interface ShopifyBuyClient {}
  interface ShopifyBuy {
    buildClient(config: BuildClientConfig): ShopifyBuyClient
    UI: { init(client: ShopifyBuyClient): UI }
  }
  const ShopifyBuy: ShopifyBuy
  export default ShopifyBuy
}
