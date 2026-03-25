# Testing — Plan 1: Vitest Unit + Component Tests

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Vitest and add unit tests for `lib/` utilities and component tests for `SearchBar`, `TagFilter`, and `Portfolio`.

**Architecture:** Vitest runs in a jsdom environment with React Testing Library for component tests. `@vitejs/plugin-react` handles JSX. `next/image` and `next/link` are mocked at the test-file level. Fake timers handle SearchBar's 150ms debounce. `History.prototype.pushState` is spied on in Portfolio tests to prevent jsdom errors.

**Tech Stack:** Vitest, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, jsdom, @vitejs/plugin-react

**Spec:** `docs/superpowers/specs/2026-03-17-testing-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `web/vitest.config.ts` | **Create** | Vitest config: jsdom env, react plugin, `@` path alias, setup file |
| `web/vitest.setup.ts` | **Create** | Import `@testing-library/jest-dom` matchers |
| `web/package.json` | **Modify** | Add dev dependencies + `test` / `test:watch` scripts |
| `web/__tests__/lib/search.test.ts` | **Create** | Unit tests for `buildSearchIndex` and `searchPhotos` |
| `web/__tests__/lib/analytics.test.ts` | **Create** | Unit tests for `trackEvent` |
| `web/__tests__/lib/sanityImageLoader.test.ts` | **Create** | Unit tests for the Sanity image loader |
| `web/__tests__/components/SearchBar.test.tsx` | **Create** | Component tests for `SearchBar` |
| `web/__tests__/components/TagFilter.test.tsx` | **Create** | Component tests for `TagFilter` |
| `web/__tests__/components/Portfolio.test.tsx` | **Create** | Component tests for `Portfolio` |

---

## Task 1: Install dependencies and configure Vitest

**Files:**
- Modify: `web/package.json`
- Create: `web/vitest.config.ts`
- Create: `web/vitest.setup.ts`

- [ ] **Step 1: Install dev dependencies**

```bash
cd web && npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Expected: packages installed, no peer dep errors.

- [ ] **Step 2: Create `web/vitest.config.ts`**

```typescript
// web/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 3: Create `web/vitest.setup.ts`**

```typescript
// web/vitest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add scripts to `web/package.json`**

Add to the `"scripts"` section:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify Vitest runs with no tests**

```bash
cd web && npm run test
```

Expected: output like `No test files found` or `0 tests passed` — no crash.

- [ ] **Step 6: Commit**

```bash
git add web/vitest.config.ts web/vitest.setup.ts web/package.json web/package-lock.json
git commit -m "feat(test): set up Vitest with jsdom and React Testing Library"
```

---

## Task 2: Unit tests for `lib/search.ts`

**Files:**
- Create: `web/__tests__/lib/search.test.ts`

`searchPhotos` uses `FUSE_OPTIONS` (threshold 0.35, minMatchCharLength 2). All tests use `buildSearchIndex` (not `new Fuse` directly) to exercise the real config.

- [ ] **Step 1: Create the test file**

```typescript
// web/__tests__/lib/search.test.ts
import { describe, it, expect } from 'vitest'
import { buildSearchIndex, searchPhotos } from '@/lib/search'
import type { Photo } from '@/types'

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    _id: 'photo-1',
    title: 'Test Photo',
    tags: [],
    aiCaption: '',
    location: null,
    camera: null,
    dateTaken: null,
    lens: null,
    focalLength: null,
    iso: null,
    shutterSpeed: null,
    aperture: null,
    visible: true,
    src: 'https://cdn.sanity.io/images/abc/production/test.jpg',
    width: 1200,
    height: 800,
    blurDataURL: null,
    ...overrides,
  }
}

const PHOTOS: Photo[] = [
  makePhoto({ _id: '1', title: 'Hammerhead Shark', tags: ['shark', 'pelagic'] }),
  makePhoto({ _id: '2', title: 'Manta Ray', tags: ['ray', 'pelagic'] }),
  makePhoto({ _id: '3', title: 'Coral Garden', tags: ['coral', 'reef'] }),
]

describe('buildSearchIndex', () => {
  it('returns a usable index with a search method', () => {
    const index = buildSearchIndex(PHOTOS)
    expect(typeof index.search).toBe('function')
  })
})

describe('searchPhotos', () => {
  const index = buildSearchIndex(PHOTOS)

  it('returns matching photos for a query', () => {
    const results = searchPhotos(index, 'hammerhead')
    expect(results).toHaveLength(1)
    expect(results[0]._id).toBe('1')
  })

  it('returns [] for a query with no matches', () => {
    const results = searchPhotos(index, 'zzznomatch')
    expect(results).toEqual([])
  })

  it('returns [] for an empty string', () => {
    const results = searchPhotos(index, '')
    expect(results).toEqual([])
  })

  it('returns [] for a whitespace-only string', () => {
    const results = searchPhotos(index, '   ')
    expect(results).toEqual([])
  })

  it('is case-insensitive', () => {
    const results = searchPhotos(index, 'HAMMERHEAD')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]._id).toBe('1')
  })

  it('matches on tags', () => {
    const results = searchPhotos(index, 'coral')
    expect(results.length).toBeGreaterThan(0)
    expect(results.find((p) => p._id === '3')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
cd web && npm run test -- __tests__/lib/search.test.ts
```

Expected: `7 tests passed`.

- [ ] **Step 3: Commit**

```bash
git add web/__tests__/lib/search.test.ts
git commit -m "test: add unit tests for lib/search"
```

---

## Task 3: Unit tests for `lib/analytics.ts`

**Files:**
- Create: `web/__tests__/lib/analytics.test.ts`

jsdom always has `window` defined, so we test the `window.gtag` guard rather than the SSR guard. The SSR guard (`typeof window === 'undefined'`) is validated by TypeScript — it can't be triggered in jsdom.

- [ ] **Step 1: Create the test file**

```typescript
// web/__tests__/lib/analytics.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { trackEvent } from '@/lib/analytics'

describe('trackEvent', () => {
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
```

- [ ] **Step 2: Run the tests**

```bash
cd web && npm run test -- __tests__/lib/analytics.test.ts
```

Expected: `4 tests passed`.

- [ ] **Step 3: Commit**

```bash
git add web/__tests__/lib/analytics.test.ts
git commit -m "test: add unit tests for lib/analytics"
```

---

## Task 4: Unit tests for `lib/sanityImageLoader.ts`

**Files:**
- Create: `web/__tests__/lib/sanityImageLoader.test.ts`

`sanityImageLoader` always sets `q` — it defaults to `85` when quality is not supplied. Width is capped at `2000` via `Math.min(width, 2000)`.

- [ ] **Step 1: Create the test file**

```typescript
// web/__tests__/lib/sanityImageLoader.test.ts
import { describe, it, expect } from 'vitest'
import sanityLoader from '@/lib/sanityImageLoader'

const BASE_SRC = 'https://cdn.sanity.io/images/abc123/production/photo.jpg'

function paramsOf(url: string) {
  return new URL(url).searchParams
}

describe('sanityImageLoader', () => {
  it('returns a URL containing the Sanity CDN domain', () => {
    const url = sanityLoader({ src: BASE_SRC, width: 800, quality: 80 })
    expect(url).toContain('cdn.sanity.io')
  })

  it('sets the w parameter to the requested width', () => {
    const url = sanityLoader({ src: BASE_SRC, width: 800, quality: 80 })
    expect(paramsOf(url).get('w')).toBe('800')
  })

  it('defaults q to 85 when quality is not provided', () => {
    // ImageLoaderProps types quality as number, but Next.js may omit it
    const url = sanityLoader({ src: BASE_SRC, width: 800, quality: undefined as unknown as number })
    expect(paramsOf(url).get('q')).toBe('85')
  })

  it('sets q to the provided quality value', () => {
    const url = sanityLoader({ src: BASE_SRC, width: 800, quality: 60 })
    expect(paramsOf(url).get('q')).toBe('60')
  })

  it('caps width at 2000px when a larger value is provided', () => {
    const url = sanityLoader({ src: BASE_SRC, width: 3000, quality: 80 })
    expect(paramsOf(url).get('w')).toBe('2000')
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
cd web && npm run test -- __tests__/lib/sanityImageLoader.test.ts
```

Expected: `5 tests passed`.

- [ ] **Step 3: Commit**

```bash
git add web/__tests__/lib/sanityImageLoader.test.ts
git commit -m "test: add unit tests for lib/sanityImageLoader"
```

---

## Task 5: Component tests for `SearchBar`

**Files:**
- Create: `web/__tests__/components/SearchBar.test.tsx`

SearchBar debounces `onSearch` by 150ms using `setTimeout`. Tests use `vi.useFakeTimers()` + `fireEvent.change` (synchronous, no internal timer usage) + `vi.advanceTimersByTime(150)`.

- [ ] **Step 1: Create the test file**

```tsx
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
```

- [ ] **Step 2: Run the tests**

```bash
cd web && npm run test -- __tests__/components/SearchBar.test.tsx
```

Expected: `3 tests passed`.

- [ ] **Step 3: Commit**

```bash
git add web/__tests__/components/SearchBar.test.tsx
git commit -m "test: add component tests for SearchBar"
```

---

## Task 6: Component tests for `TagFilter`

**Files:**
- Create: `web/__tests__/components/TagFilter.test.tsx`

TagFilter returns `null` (not just empty) when `tags` is empty. Active tag gets `bg-sky-500` class.

- [ ] **Step 1: Create the test file**

```tsx
// web/__tests__/components/TagFilter.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TagFilter from '@/components/TagFilter'

describe('TagFilter', () => {
  const TAGS = ['shark', 'coral', 'ray']

  it('renders all provided tags as buttons', () => {
    render(<TagFilter tags={TAGS} activeTag={null} onTagClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'shark' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'coral' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ray' })).toBeInTheDocument()
  })

  it('calls onTagClick with the tag name when a tag is clicked', () => {
    const onTagClick = vi.fn()
    render(<TagFilter tags={TAGS} activeTag={null} onTagClick={onTagClick} />)

    fireEvent.click(screen.getByRole('button', { name: 'coral' }))

    expect(onTagClick).toHaveBeenCalledOnce()
    expect(onTagClick).toHaveBeenCalledWith('coral')
  })

  it('applies active styling (bg-sky-500) to the active tag', () => {
    render(<TagFilter tags={TAGS} activeTag="shark" onTagClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'shark' })).toHaveClass('bg-sky-500')
  })

  it('does not apply active styling to non-active tags', () => {
    render(<TagFilter tags={TAGS} activeTag="shark" onTagClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'coral' })).not.toHaveClass('bg-sky-500')
  })

  it('renders nothing when given an empty tags array', () => {
    const { container } = render(
      <TagFilter tags={[]} activeTag={null} onTagClick={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
cd web && npm run test -- __tests__/components/TagFilter.test.tsx
```

Expected: `5 tests passed`.

- [ ] **Step 3: Commit**

```bash
git add web/__tests__/components/TagFilter.test.tsx
git commit -m "test: add component tests for TagFilter"
```

---

## Task 7: Component tests for `Portfolio`

**Files:**
- Create: `web/__tests__/components/Portfolio.test.tsx`

Portfolio renders `next/image` and `next/link` which must be mocked at the module level. It also calls `Object.getPrototypeOf(window.history).pushState` (History prototype, not instance) which must be spied on. Search uses the SearchBar 150ms debounce — tests use `fireEvent.change` + fake timer advancement.

- [ ] **Step 1: Create the test file**

```tsx
// web/__tests__/components/Portfolio.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Photo } from '@/types'

// Mock next/image — renders a plain <img> in jsdom
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

// Mock next/link — renders a plain <a> in jsdom
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => <a href={href} {...rest}>{children}</a>,
}))

// Mock PhotoModal — prevents jsdom failures from its transitive dependencies
vi.mock('@/components/PhotoModal', () => ({
  default: () => null,
}))

// Import Portfolio AFTER mocks are registered
import Portfolio from '@/components/Portfolio'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    _id: 'photo-1',
    title: 'Test Photo',
    tags: [],
    aiCaption: '',
    location: null,
    camera: null,
    dateTaken: null,
    lens: null,
    focalLength: null,
    iso: null,
    shutterSpeed: null,
    aperture: null,
    visible: true,
    src: 'https://cdn.sanity.io/images/abc/production/test.jpg',
    width: 800,
    height: 600,
    blurDataURL: null,
    ...overrides,
  }
}

const PHOTOS: Photo[] = [
  makePhoto({ _id: '1', title: 'Hammerhead Shark', tags: ['shark'] }),
  makePhoto({ _id: '2', title: 'Manta Ray', tags: ['ray'] }),
  makePhoto({ _id: '3', title: 'Coral Garden', tags: ['coral'] }),
]

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Portfolio', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Portfolio calls Object.getPrototypeOf(window.history).pushState directly.
    // Spy on the History prototype to prevent jsdom navigation errors.
    vi.spyOn(Object.getPrototypeOf(window.history), 'pushState').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders all photos initially', () => {
    render(<Portfolio photos={PHOTOS} />)
    expect(screen.getByAltText('Hammerhead Shark')).toBeInTheDocument()
    expect(screen.getByAltText('Manta Ray')).toBeInTheDocument()
    expect(screen.getByAltText('Coral Garden')).toBeInTheDocument()
  })

  it('filters photos by search query after the 150ms debounce', () => {
    render(<Portfolio photos={PHOTOS} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'hammerhead' } })
    vi.advanceTimersByTime(150)

    expect(screen.getByAltText('Hammerhead Shark')).toBeInTheDocument()
    expect(screen.queryByAltText('Manta Ray')).not.toBeInTheDocument()
    expect(screen.queryByAltText('Coral Garden')).not.toBeInTheDocument()
  })

  it('shows the "no results" message when the query matches nothing', () => {
    render(<Portfolio photos={PHOTOS} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'zzznomatch' } })
    vi.advanceTimersByTime(150)

    expect(screen.getByText(/no photos match/i)).toBeInTheDocument()
  })

  it('filters photos by tag when a tag is clicked', () => {
    render(<Portfolio photos={PHOTOS} />)

    fireEvent.click(screen.getByRole('button', { name: 'coral' }))

    expect(screen.getByAltText('Coral Garden')).toBeInTheDocument()
    expect(screen.queryByAltText('Hammerhead Shark')).not.toBeInTheDocument()
    expect(screen.queryByAltText('Manta Ray')).not.toBeInTheDocument()
  })

  it('restores all photos when "Clear filters" is clicked', () => {
    render(<Portfolio photos={PHOTOS} />)

    // Trigger no-results state
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'zzznomatch' } })
    vi.advanceTimersByTime(150)

    fireEvent.click(screen.getByText(/clear filters/i))

    expect(screen.getByAltText('Hammerhead Shark')).toBeInTheDocument()
    expect(screen.getByAltText('Manta Ray')).toBeInTheDocument()
    expect(screen.getByAltText('Coral Garden')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
cd web && npm run test -- __tests__/components/Portfolio.test.tsx
```

Expected: `5 tests passed`.

- [ ] **Step 3: Run the full test suite**

```bash
cd web && npm run test
```

Expected: all tests across all files pass (20 total).

- [ ] **Step 4: Commit**

```bash
git add web/__tests__/components/Portfolio.test.tsx
git commit -m "test: add component tests for Portfolio"
```
