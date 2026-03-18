import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('adminApi', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('updatePhoto', () => {
    it('sends PATCH to /api/admin/photos with id and fields', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      const { updatePhoto } = await import('@/lib/adminApi')
      await updatePhoto('photo-123', { title: 'New Title' })
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'photo-123', fields: { title: 'New Title' } }),
      })
    })

    it('throws ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })
      const { updatePhoto } = await import('@/lib/adminApi')
      await expect(updatePhoto('photo-123', { title: 'x' })).rejects.toThrow('Server error')
    })
  })

  describe('toggleSetting', () => {
    it('sends PATCH to /api/admin/settings', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      const { toggleSetting } = await import('@/lib/adminApi')
      await toggleSetting('showCaptions', true)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showCaptions: true }),
      })
    })
  })

  describe('deletePhoto', () => {
    it('sends DELETE to /api/admin/photos with id and imageRef', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      const { deletePhoto } = await import('@/lib/adminApi')
      await deletePhoto('photo-123', 'image-abc')
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'photo-123', imageRef: 'image-abc' }),
      })
    })
  })
})
