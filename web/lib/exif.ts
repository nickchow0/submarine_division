// ─── EXIF Parser ──────────────────────────────────────────────────────────────
// Pure Node.js JPEG/EXIF parser — no external dependencies.
// Reads camera, lens, focal length, ISO, shutter speed, aperture, and date
// from the binary EXIF segment embedded in JPEG files.

// ─── Camera display name mapping ─────────────────────────────────────────────
// Maps raw EXIF camera strings (Make + Model) to friendly display names.
const CAMERA_DISPLAY_NAMES: Record<string, string> = {
  'SONY ILCE-7RM2': 'Sony A7RII',
  'SONY ILCE-7RM3': 'Sony A7RIII',
  'SONY ILCE-7RM4': 'Sony A7RIV',
  'SONY ILCE-7RM5': 'Sony A7RV',
}

export function formatCamera(camera: string | null | undefined): string | null {
  if (!camera) return null
  return CAMERA_DISPLAY_NAMES[camera.trim().toUpperCase()] ?? camera
}

export type ExifData = {
  camera?:       string
  lens?:         string
  focalLength?:  string
  iso?:          string
  shutterSpeed?: string
  aperture?:     string
  dateTaken?:    string
}

// Debug helper — dumps every raw tag found in the EXIF to console
export function dumpExifTags(buf: Buffer): void {
  const TAG_NAMES: Record<number, string> = {
    271: 'Make', 272: 'Model', 274: 'Orientation',
    33434: 'ExposureTime', 33437: 'FNumber', 34665: 'ExifIFD',
    34855: 'ISOSpeedRatings', 36867: 'DateTimeOriginal',
    37386: 'FocalLength', 42036: 'LensModel',
  }
  const TYPE_NAMES: Record<number, string> = {
    1:'BYTE', 2:'ASCII', 3:'SHORT', 4:'LONG', 5:'RATIONAL', 7:'UNDEF', 9:'SLONG', 10:'SRATIONAL'
  }

  if (buf.length < 4 || buf[0] !== 0xFF || buf[1] !== 0xD8) {
    console.log('  Not a JPEG')
    return
  }
  let offset = 2
  while (offset < buf.length - 4) {
    if (buf[offset] !== 0xFF) break
    const marker = buf[offset + 1]
    const segLen = buf.readUInt16BE(offset + 2)
    if (marker === 0xE1 && offset + 10 <= buf.length) {
      const header = buf.slice(offset + 4, offset + 10).toString('ascii')
      if (header === 'Exif\x00\x00') {
        const tiffStart = offset + 10
        const le = buf.slice(tiffStart, tiffStart + 2).toString('ascii') === 'II'
        const r16 = (o: number) => le ? buf.readUInt16LE(tiffStart + o) : buf.readUInt16BE(tiffStart + o)
        const r32 = (o: number) => le ? buf.readUInt32LE(tiffStart + o) : buf.readUInt32BE(tiffStart + o)
        console.log(`  Byte order: ${le ? 'little-endian (II)' : 'big-endian (MM)'}`)

        function dumpIfd(ifdOff: number, label: string) {
          if (ifdOff + 2 > buf.length - tiffStart) return
          const n = r16(ifdOff)
          console.log(`  ${label}: ${n} entries`)
          for (let i = 0; i < n; i++) {
            const e = ifdOff + 2 + i * 12
            if (e + 12 > buf.length - tiffStart) break
            const tag  = r16(e)
            const type = r16(e + 2)
            const cnt  = r32(e + 4)
            const rawValOffset = le ? buf.readUInt32LE(tiffStart + e + 8) : buf.readUInt32BE(tiffStart + e + 8)
            const name = TAG_NAMES[tag] ?? `tag_${tag}`
            const typeName = TYPE_NAMES[type] ?? `type_${type}`
            const sz = ({1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8} as Record<number,number>)[type] ?? 1
            const inline = sz * cnt <= 4
            console.log(`    [${tag}] ${name}  type=${typeName}(${type}) count=${cnt} ${inline ? `inline=0x${rawValOffset.toString(16)}` : `ptr=0x${rawValOffset.toString(16)}`}`)
          }
        }

        const ifd0Off = r32(4)
        dumpIfd(ifd0Off, 'IFD0')
        const exifPtr = r32(ifd0Off + 2 + (() => {
          const n = r16(ifd0Off); for (let i=0;i<n;i++) { if (r16(ifd0Off+2+i*12)===34665) return i*12; } return -1000
        })() + 8)
        if (exifPtr < buf.length - tiffStart) dumpIfd(exifPtr, 'ExifSubIFD')
        return
      }
    }
    if (marker === 0xD9) break
    offset += 2 + segLen
  }
  console.log('  No EXIF APP1 found')
}

export function parseExif(buf: Buffer): ExifData {
  // Verify JPEG SOI marker
  if (buf.length < 4 || buf[0] !== 0xFF || buf[1] !== 0xD8) return {}

  // Walk JPEG segments looking for APP1 (FF E1) containing Exif
  let offset = 2
  while (offset < buf.length - 4) {
    if (buf[offset] !== 0xFF) break
    const marker = buf[offset + 1]
    const segLen = buf.readUInt16BE(offset + 2) // includes the 2-byte length field

    if (marker === 0xE1 && offset + 10 <= buf.length) {
      const header = buf.slice(offset + 4, offset + 10).toString('ascii')
      if (header === 'Exif\x00\x00') {
        return parseTiff(buf, offset + 10)
      }
    }

    if (marker === 0xD9 || marker === 0xD8) break
    offset += 2 + segLen
  }

  return {}
}

function parseTiff(buf: Buffer, tiffStart: number): ExifData {
  if (tiffStart + 8 > buf.length) return {}

  const byteOrder = buf.slice(tiffStart, tiffStart + 2).toString('ascii')
  const le = byteOrder === 'II' // little-endian ('MM' = big-endian)

  const r16  = (o: number) => le ? buf.readUInt16LE(tiffStart + o) : buf.readUInt16BE(tiffStart + o)
  const r32  = (o: number) => le ? buf.readUInt32LE(tiffStart + o) : buf.readUInt32BE(tiffStart + o)
  const rs32 = (o: number) => le ? buf.readInt32LE(tiffStart + o)  : buf.readInt32BE(tiffStart + o)

  if (r16(2) !== 42) return {} // TIFF magic

  const ifd0Offset = r32(4)

  function readIfd(ifdOffset: number): Map<number, unknown> {
    if (ifdOffset + 2 > buf.length - tiffStart) return new Map()
    const count = r16(ifdOffset)
    const tags  = new Map<number, unknown>()

    for (let i = 0; i < count; i++) {
      const e = ifdOffset + 2 + i * 12
      if (e + 12 > buf.length - tiffStart) break

      const tag  = r16(e)
      const type = r16(e + 2)
      const cnt  = r32(e + 4)

      const typeSize: Record<number, number> = { 1:1, 2:1, 3:2, 4:4, 5:8, 7:1, 9:4, 10:8 }
      const sz = typeSize[type] ?? 1
      const totalBytes = sz * cnt
      const dataOffset = totalBytes <= 4 ? e + 8 : r32(e + 8)

      try {
        if (type === 2) {
          // ASCII
          tags.set(tag, buf.slice(tiffStart + dataOffset, tiffStart + dataOffset + cnt)
            .toString('ascii').replace(/\0/g, '').trim())
        } else if (type === 3) {
          tags.set(tag, r16(dataOffset))
        } else if (type === 4) {
          tags.set(tag, r32(dataOffset))
        } else if (type === 5) {
          tags.set(tag, { num: r32(dataOffset), den: r32(dataOffset + 4) })
        } else if (type === 10) {
          tags.set(tag, { num: rs32(dataOffset), den: rs32(dataOffset + 4) })
        } else if (type === 9) {
          tags.set(tag, rs32(dataOffset))
        }
      } catch { /* skip malformed entry */ }
    }

    return tags
  }

  const ifd0 = readIfd(ifd0Offset)
  let exifTags = new Map<number, unknown>()
  const exifOffset = ifd0.get(34665) // Exif SubIFD pointer
  if (typeof exifOffset === 'number') {
    exifTags = readIfd(exifOffset)
  }

  const all = new Map([...ifd0, ...exifTags])
  const result: ExifData = {}

  // ── Camera (271 = Make, 272 = Model) ──────────────────────────────────────
  const make  = ((all.get(271) as string) ?? '').trim()
  const model = ((all.get(272) as string) ?? '').trim()
  if (model) {
    result.camera = (make && !model.toLowerCase().startsWith(make.toLowerCase()))
      ? `${make} ${model}`
      : model
  }

  // ── Lens (42036 = LensModel) ───────────────────────────────────────────────
  const lens = ((all.get(42036) as string) ?? '').trim()
  if (lens) result.lens = lens

  // ── Focal length (37386) ──────────────────────────────────────────────────
  const fl = all.get(37386) as { num: number; den: number } | undefined
  if (fl?.den) {
    const mm = fl.num / fl.den
    result.focalLength = `${Number.isInteger(mm) ? mm : mm.toFixed(1)}mm`
  }

  // ── ISO (34855 = ISOSpeedRatings) ─────────────────────────────────────────
  const iso = all.get(34855)
  if (iso !== undefined) result.iso = String(iso)

  // ── Shutter speed (33434 = ExposureTime) ──────────────────────────────────
  const et = all.get(33434) as { num: number; den: number } | undefined
  if (et?.den) {
    const s = et.num / et.den
    result.shutterSpeed = s >= 1
      ? `${s.toFixed(1).replace(/\.0$/, '')}`
      : `1/${Math.round(1 / s)}`
  }

  // ── Aperture (33437 = FNumber) ────────────────────────────────────────────
  const fn = all.get(33437) as { num: number; den: number } | undefined
  if (fn?.den) {
    const fval = fn.num / fn.den
    result.aperture = `f/${fval % 1 === 0 ? fval : fval.toFixed(1)}`
  }

  // ── Date taken (36867 = DateTimeOriginal) ─────────────────────────────────
  const dt = (all.get(36867) as string | undefined) ?? ''
  const m = dt.match(/^(\d{4}):(\d{2}):(\d{2})/)
  if (m) result.dateTaken = `${m[1]}-${m[2]}-${m[3]}`

  return result
}
