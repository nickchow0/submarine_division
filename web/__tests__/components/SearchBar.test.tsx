// web/__tests__/components/SearchBar.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchBar from '@/components/SearchBar'

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a text input', () => {
    render(<SearchBar onSearch={vi.fn()} resultCount={5} totalCount={10} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('calls onSearch with the typed value after the 150ms debounce', () => {
    const onSearch = vi.fn()
    render(<SearchBar onSearch={onSearch} resultCount={5} totalCount={10} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'shark' } })

    // Has not fired yet — still within debounce window
    expect(onSearch).not.toHaveBeenCalled()

    vi.advanceTimersByTime(150)

    expect(onSearch).toHaveBeenCalledOnce()
    expect(onSearch).toHaveBeenCalledWith('shark')
  })

  it('shows the result and total count', () => {
    render(<SearchBar onSearch={vi.fn()} resultCount={3} totalCount={10} />)
    expect(screen.getByText('3 of 10 photos')).toBeInTheDocument()
  })
})
