'use client'

import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import type { Photo } from '@/types'

type Props = {
  photo: Photo
}

export default function PinchZoomImage({ photo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale]       = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)

  // Track initial pinch distance and state at start of gesture
  const lastDist  = useRef(0)
  const lastScale = useRef(1)
  const lastX     = useRef(0)
  const lastY     = useRef(0)
  const startX    = useRef(0)
  const startY    = useRef(0)

  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const getMidpoint = (touches: React.TouchList) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  })

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastDist.current  = getDistance(e.touches)
      lastScale.current = scale
      lastX.current     = translateX
      lastY.current     = translateY
    } else if (e.touches.length === 1 && scale > 1) {
      startX.current = e.touches[0].clientX - translateX
      startY.current = e.touches[0].clientY - translateY
    }
  }, [scale, translateX, translateY])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 2) {
      // Pinch-to-zoom
      const newDist  = getDistance(e.touches)
      const ratio    = newDist / lastDist.current
      const newScale = Math.min(Math.max(lastScale.current * ratio, 1), 4)

      // Keep zoom centred on pinch midpoint
      const mid = getMidpoint(e.touches)
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const originX = mid.x - rect.left - rect.width  / 2
        const originY = mid.y - rect.top  - rect.height / 2
        const scaleChange = newScale - lastScale.current
        setTranslateX(lastX.current - originX * scaleChange / lastScale.current)
        setTranslateY(lastY.current - originY * scaleChange / lastScale.current)
      }
      setScale(newScale)

    } else if (e.touches.length === 1 && scale > 1) {
      // Pan while zoomed
      const newX = e.touches[0].clientX - startX.current
      const newY = e.touches[0].clientY - startY.current
      setTranslateX(newX)
      setTranslateY(newY)
    }
  }, [scale])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0 && scale < 1.05) {
      // Snap back to 1x if nearly reset
      setScale(1)
      setTranslateX(0)
      setTranslateY(0)
    }
  }, [scale])

  const handleDoubleClick = useCallback(() => {
    // Double-tap to reset
    setScale(1)
    setTranslateX(0)
    setTranslateY(0)
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-lg"
      style={{ touchAction: 'none' }}
    >
      <div
        style={{
          transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
          transformOrigin: 'center center',
          transition: scale === 1 ? 'transform 0.2s ease' : 'none',
          willChange: 'transform',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <Image
          src={photo.src}
          alt={photo.title}
          width={photo.width}
          height={photo.height}
          className="w-full h-auto object-contain max-h-[80vh]"
          placeholder={photo.blurDataURL ? 'blur' : 'empty'}
          blurDataURL={photo.blurDataURL ?? undefined}
          priority
          sizes="(max-width: 1024px) 100vw, 1024px"
          draggable={false}
        />
      </div>
    </div>
  )
}
