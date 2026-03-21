import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const IMAGE_URL =
  "https://cdn.sanity.io/images/vtmlottj/production/b3e74f0917b8d1240ee35d8538c7b2f028899b17-5304x7952.jpg" +
  "?w=64&h=64&fit=crop&crop=center";

export default function Icon() {
  return new ImageResponse(<img src={IMAGE_URL} width={32} height={32} />, {
    width: 32,
    height: 32,
  });
}
