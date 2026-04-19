// ─── Admin Caption Generation API ────────────────────────────────────────────
// POST /api/admin/captions
//   { photoId, imageRef } → regenerates caption for one photo
//   { all: true }         → regenerates captions for all photos missing one
//
// Reuses the same Claude vision + Sanity write logic as the webhook route.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sanityClient, sanityWriteClient, urlFor } from "@/lib/sanity";

async function generateCaption(
  photoId: string,
  imageRef: string,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const imageUrl = urlFor({ _ref: imageRef }).width(1200).quality(85).url();
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok)
    throw new Error(`Failed to fetch image: ${imageRes.status}`);

  const buffer = await imageRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = (imageRes.headers.get("content-type") ?? "image/jpeg") as
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: contentType, data: base64 },
          },
          {
            type: "text",
            text: `Describe this underwater or nature photograph in 1-2 concise sentences for a searchable image library caption.

Include as many of these as visible: subject/species, behavior or action, environment/habitat, water conditions, lighting, colors, mood.

Be specific and factual. Do not use subjective phrases like "stunning" or "beautiful".
Start directly with the subject — no preamble.`,
          },
        ],
      },
    ],
  });

  const caption =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";
  if (!caption) throw new Error("Empty caption from Claude");

  await sanityWriteClient.patch(photoId).set({ aiCaption: caption }).commit();
  return caption;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Single photo ─────────────────────────────────────────────────────────
    if (body.photoId && body.imageRef) {
      const caption = await generateCaption(body.photoId, body.imageRef);
      return NextResponse.json({ ok: true, caption });
    }

    // ── All photos missing captions ───────────────────────────────────────────
    if (body.all) {
      const missing = await sanityClient.fetch<
        { _id: string; imageRef: string }[]
      >(`
        *[_type == "photo" && (aiCaption == null || aiCaption == "")] {
          _id,
          "imageRef": image.asset._ref
        }
      `);

      const results: {
        id: string;
        ok: boolean;
        caption?: string;
        error?: string;
      }[] = [];

      for (const photo of missing) {
        try {
          const caption = await generateCaption(photo._id, photo.imageRef);
          results.push({ id: photo._id, ok: true, caption });
        } catch (err) {
          results.push({ id: photo._id, ok: false, error: String(err) });
        }
      }

      return NextResponse.json({ ok: true, results });
    }

    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 },
    );
  } catch (err) {
    console.error("Caption generation error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
