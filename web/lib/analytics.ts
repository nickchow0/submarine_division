// Declare the global gtag function injected by the GA4 script tag.
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js',
      targetIdOrAction: string | Date,
      params?: Record<string, unknown>
    ) => void
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', eventName, params)
}
