import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const IMAGE_URL =
  "https://cdn.sanity.io/images/vtmlottj/production/267109e05fb4acc3a9d88fdf3a3ebf8a01c82c8e-4000x2668.jpg" +
  "?w=1200&h=630&fit=crop&crop=center";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
      }}
    >
      <img
        src={IMAGE_URL}
        width={1200}
        height={630}
        style={{ objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "40px 48px",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <span
          style={{
            color: "#38bdf8",
            fontSize: 48,
            fontFamily: "serif",
            fontWeight: 400,
          }}
        >
          SubmarineDivision
        </span>
        <span style={{ color: "#94a3b8", fontSize: 22 }}>
          Underwater Photography by Nick Chow
        </span>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
