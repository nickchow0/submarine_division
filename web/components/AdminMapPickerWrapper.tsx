'use client'

import dynamic from 'next/dynamic'
import type { PinBase } from '@/components/AdminMapPicker'

const AdminMapPicker = dynamic(() => import('@/components/AdminMapPicker'), { ssr: false })

type Props = {
  pins: PinBase[]
  pendingCoords: { lat: number; lng: number } | null
  onMapClick: (lat: number, lng: number) => void
  onPinClick: (pin: PinBase) => void
}

export default function AdminMapPickerWrapper(props: Props) {
  return <AdminMapPicker {...props} />
}

export type { PinBase }
