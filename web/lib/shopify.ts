// ─── Shopify Admin API helper ─────────────────────────────────────────────────
// Used server-side only (API routes). Never import in client components.
//
// Uses the Shopify Admin REST API 2024-01.
// Rate-limit (429) is surfaced as a typed return value so callers can
// propagate a 5xx and trigger Sanity's built-in webhook retry.

const SHOPIFY_API_VERSION = '2024-01'

function shopifyAdminUrl(path: string): string {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  return `https://${domain}/admin/api/${SHOPIFY_API_VERSION}${path}`
}

async function shopifyAdminFetch(
  path: string,
  options: RequestInit = {},
): Promise<{ data: unknown; status: number }> {
  const res = await fetch(shopifyAdminUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_TOKEN!,
      ...options.headers,
    },
  })

  if (res.status === 429) return { data: null, status: 429 }

  let data: unknown = null
  if (res.ok) {
    try { data = await res.json() } catch { /* ignore */ }
  }
  return { data, status: res.status }
}

// Sanity _id is already URL-safe but may contain dots or underscores.
// Shopify handles must be lowercase alphanumeric + hyphens only.
function normalizeHandle(sanityId: string): string {
  return sanityId.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export type ShopifyPhotoInput = {
  _id: string
  title: string
  aiCaption?: string
  tags?: string[]
  src?: string
}

export type UpsertResult =
  | { shopifyProductId: string }
  | { rateLimited: true }
  | { error: string }

export async function upsertShopifyProduct(photo: ShopifyPhotoInput): Promise<UpsertResult> {
  const handle = normalizeHandle(photo._id)

  // Check whether a product with this handle already exists
  const { data: existingData, status: getStatus } = await shopifyAdminFetch(
    `/products.json?handle=${handle}&limit=1&fields=id`,
  )
  if (getStatus === 429) return { rateLimited: true }

  const existing = (existingData as { products?: { id: number }[] })?.products?.[0]

  const productPayload: Record<string, unknown> = {
    title: photo.title,
    body_html: photo.aiCaption ?? '',
    handle,
    tags: photo.tags?.join(', ') ?? '',
    status: 'active',
  }
  if (photo.src) {
    productPayload.images = [{ src: photo.src }]
  }

  if (existing) {
    // Update existing — same handle, same Shopify product
    const { status } = await shopifyAdminFetch(`/products/${existing.id}.json`, {
      method: 'PUT',
      body: JSON.stringify({ product: productPayload }),
    })
    if (status === 429) return { rateLimited: true }
    return { shopifyProductId: String(existing.id) }
  } else {
    // Create new product
    const { data, status } = await shopifyAdminFetch('/products.json', {
      method: 'POST',
      body: JSON.stringify({ product: productPayload }),
    })
    if (status === 429) return { rateLimited: true }
    const id = (data as { product?: { id: number } })?.product?.id
    if (!id) return { error: 'No product ID in Shopify response' }
    return { shopifyProductId: String(id) }
  }
}

export async function archiveShopifyProduct(shopifyProductId: string): Promise<void> {
  await shopifyAdminFetch(`/products/${shopifyProductId}.json`, {
    method: 'PUT',
    body: JSON.stringify({ product: { status: 'archived' } }),
  })
}
