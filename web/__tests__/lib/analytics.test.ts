// web/__tests__/lib/analytics.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trackEvent } from '@/lib/analytics'

describe('trackEvent', () => {
  beforeEach(() => {
    // @ts-expect-error - ensure clean state before each test
    delete window.gtag
  })

  afterEach(() => {
    // Clean up any gtag set during tests
    // @ts-expect-error - deleting a declared global for test cleanup
    delete window.gtag
  })

  it('does not throw when window.gtag is not present', () => {
    // window.gtag is undefined by default in jsdom
    expect(() => trackEvent('test_event')).not.toThrow()
  })

  it('does not throw when window.gtag is not a function', () => {
    // @ts-expect-error - intentionally invalid value to test the guard
    window.gtag = 'not-a-function'
    expect(() => trackEvent('test_event')).not.toThrow()
  })

  it('calls window.gtag with the event name and params', () => {
    const mockGtag = vi.fn()
    window.gtag = mockGtag

    trackEvent('photo_view', { photo_id: 'abc', photo_title: 'Test' })

    expect(mockGtag).toHaveBeenCalledWith('event', 'photo_view', {
      photo_id: 'abc',
      photo_title: 'Test',
    })
  })

  it('calls window.gtag with undefined params when none provided', () => {
    const mockGtag = vi.fn()
    window.gtag = mockGtag

    trackEvent('page_view')

    expect(mockGtag).toHaveBeenCalledWith('event', 'page_view', undefined)
  })
})
