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
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      schema: z.object({
        holdings: z.array(
          z.object({
            ticker: z.string().regex(/^[A-Z]{1,5}$/),
            shares: z.number().min(0),
          })
        ),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This image is a screenshot from a stock brokerage app (SoFi, Robinhood, Fidelity, Schwab, Webull, etc.) showing a portfolio of stock holdings.

Extract ONLY real US stock ticker symbols and their EXACT share counts. Important rules:
- Shares are often fractional decimals (e.g. 1.5254, 4.42728, 22.64889). Read the EXACT number from the "Shares" column.
- The ticker symbol is the short uppercase code (e.g. AAPL, TSLA, GOOGL, SCHD).
- Do NOT extract company names, column headers, or non-stock text as tickers.
- If this is NOT a brokerage portfolio screenshot, return an empty holdings array.
- If shares aren't visible for a holding, use 1 as default (not 0).`,
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
