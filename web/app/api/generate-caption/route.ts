// ─── API Route: Generate AI Caption ──────────────────────────────────────────
// This is a Node.js API route (not React). It runs on the server only.
// Sanity calls this endpoint via a webhook every time a photo is published.
//
// Flow:
//   1. Sanity publishes a photo → fires POST to /api/generate-caption
//   2. This route verifies the request came from Sanity (optional but recommended)
//   3. Downloads the image URL from Sanity's CDN
//   4. Sends it to Claude's vision API with a description prompt
//   5. Writes the caption back into the Sanity document
//   6. Returns { ok: true }

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sanityWriteClient } from "@/lib/sanity";
import type { SanityWebhookPayload } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse the Sanity webhook payload ──────────────────────────────────
    const payload: SanityWebhookPayload = await req.json();

    // Only process photo documents
    if (payload._type !== "photo") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Skip if there's no image attached yet
    if (!payload.image?.asset?._ref) {
      return NextResponse.json({ ok: true, skipped: "no image" });
    }

    // ── 2. Build the image URL from the Sanity asset reference ───────────────
    // Sanity asset refs look like: "image-abc123-1920x1080-jpg"
    // We need to convert that to a CDN URL.
    const ref = payload.image.asset._ref;
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

    // ref format:  "image-{id}-{WxH}-{format}"
    // CDN expects: "{id}-{WxH}.{format}"  ← dimensions must stay in the filename
    const withoutPrefix = ref.replace(/^image-/, "");
    const lastDash = withoutPrefix.lastIndexOf("-");
    const nameWithDims = withoutPrefix.slice(0, lastDash);
    const format = withoutPrefix.slice(lastDash + 1);
    const imageUrl = `https://cdn.sanity.io/images/${projectId}/${dataset}/${nameWithDims}.${format}?w=1200&q=85`;

    // ── 3. Fetch image and convert to base64 ─────────────────────────────────
    // The Anthropic SDK requires images as base64, not URLs.
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok)
      throw new Error(`Failed to fetch image: ${imageRes.status}`);
    const imageBuffer = await imageRes.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    const contentType = imageRes.headers.get("content-type") ?? "image/jpeg";

    // ── 4. Send to Claude Vision ──────────────────────────────────────────────
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: contentType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: imageBase64,
              },
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
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";

    if (!caption) {
      return NextResponse.json(
        { ok: false, error: "Empty caption from Claude" },
        { status: 500 },
      );
    }

    // ── 5. Write the caption back to Sanity ──────────────────────────────────
    await sanityWriteClient
      .patch(payload._id)
      .set({ aiCaption: caption })
      .commit();

    console.log(
      `✅ Caption generated for ${payload._id}: "${caption.slice(0, 60)}…"`,
    );

    return NextResponse.json({ ok: true, caption });
  } catch (err) {
    console.error("Caption generation error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}

// Sanity webhooks send POST requests, reject everything else
export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
