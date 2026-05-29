import QRCode from "qrcode";

const SITE_URL = "https://submarinedivision.com";

export default async function QRPage() {
  const svg = await QRCode.toString(SITE_URL, {
    type: "svg",
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-black gap-6 pt-12">
      <div
        className="w-64 h-64 rounded-lg overflow-hidden"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="text-white/50 text-sm">{SITE_URL}</p>
    </div>
  );
}
