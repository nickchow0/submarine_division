"use client";

import AdminMapPicker from "@/components/AdminMapPicker";
import type { PinBase } from "@/components/AdminMapPicker";

type Props = {
  pins: PinBase[];
  pendingCoords: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onPinClick: (pin: PinBase) => void;
};

export default function AdminMapPickerWrapper(props: Props) {
  return <AdminMapPicker {...props} />;
}

export type { PinBase };
