import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod/v4";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "Base64 image required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const { object } = await generateObject({
      model: groq("llama-3.2-90b-vision-preview"),
      schema: z.object({
        holdings: z.array(
          z.object({
            ticker: z.string().regex(/^[A-Z]{1,5}$/),
            shares: z.number().min(0).default(0),
          })
        ).min(1),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all stock ticker symbols and their share counts from this brokerage screenshot. For each holding, return the uppercase US ticker symbol and the number of shares. If shares aren't visible, use 0.",
            },
            {
              type: "image",
              image,
            },
          ],
        },
      ],
    });

    return NextResponse.json(object);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
