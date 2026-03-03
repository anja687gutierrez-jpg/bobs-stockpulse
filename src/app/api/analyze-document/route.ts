import { NextRequest, NextResponse } from "next/server";
import { generateText, generateObject } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod/v4";

const MAX_ANALYSIS_LENGTH = 32000;

export async function POST(req: NextRequest) {
  try {
    const { file } = await req.json();
    if (!file || typeof file !== "string") {
      return NextResponse.json(
        { error: "Base64 PDF required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Decode base64 PDF
    const base64Data = file.replace(/^data:application\/pdf;base64,/, "");
    const pdfBuffer = Buffer.from(base64Data, "base64");

    // Import from lib/ directly — the root index.js requires 'fs' unconditionally
    // which crashes on Cloudflare Workers
    // @ts-expect-error: no type declarations for sub-path
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const parsed = await pdfParse(pdfBuffer);
    const fullText = parsed.text;

    if (!fullText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from PDF" },
        { status: 400 }
      );
    }

    // Extract the portfolio section for holdings extraction (much smaller than full text)
    const portfolioSection = extractPortfolioSection(fullText);
    const analysisText = fullText.slice(0, MAX_ANALYSIS_LENGTH);

    // Run analysis and holdings extraction in parallel
    const [analysisResult, holdingsResult] = await Promise.allSettled([
      generateText({
        model: groq("llama-3.3-70b-versatile"),
        system: `You are a senior financial analyst. Analyze the following document and provide a structured breakdown. Use markdown formatting with headers and bullet points.

Include these sections where applicable:
- **Document Type** — what kind of document this is (brokerage statement, earnings report, SEC filing, etc.)
- **Key Metrics** — portfolio value, revenue, EPS, margins, growth rates
- **Holdings Overview** — if this is a brokerage statement, summarize the top holdings by value
- **Revenue & Earnings Trends** — quarter-over-quarter and year-over-year changes
- **Risks & Concerns** — red flags, headwinds, uncertainties
- **Notable Changes** — management shifts, strategy pivots, guidance updates
- **Investment Implications** — what this means for investors, bull/bear case

Be concise but thorough. If the document is not financial in nature, say so and summarize what you can.`,
        prompt: analysisText,
      }),

      // Only attempt holdings extraction if we found a portfolio section
      portfolioSection
        ? generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: z.object({
              holdings: z.array(
                z.object({
                  ticker: z.string(),
                  shares: z.number(),
                })
              ),
            }),
            prompt: `Extract every stock holding from this brokerage portfolio summary. For each holding, return the ticker symbol and share count (quantity).

Rules:
- Ticker is the SHORT UPPERCASE code (AAPL, TSLA, GOOGL, FCX, J, O, etc.)
- Shares is the QUANTITY number (often fractional like 2.08529 or 40.73848)
- Include ALL holdings, even single-letter tickers like J or O
- If a ticker appears multiple times (e.g. in both M and O account types), SUM the shares
- Do NOT include headers, descriptions, or non-ticker text
- Skip any holding where quantity is "Not Available"

Portfolio text:
${portfolioSection}`,
          })
        : Promise.resolve(null),
    ]);

    const analysis =
      analysisResult.status === "fulfilled" ? analysisResult.value.text : null;

    let holdings: Array<{ ticker: string; shares: number }> = [];
    if (
      holdingsResult.status === "fulfilled" &&
      holdingsResult.value !== null
    ) {
      holdings = holdingsResult.value.object.holdings.filter(
        (h) => /^[A-Z]{1,5}$/.test(h.ticker) && h.shares > 0
      );
    }

    const extractionError =
      holdingsResult.status === "rejected"
        ? holdingsResult.reason?.message
        : undefined;

    return NextResponse.json({
      analysis,
      holdings,
      holdingsCount: holdings.length,
      ...(extractionError && { extractionError }),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Document analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Extracts the portfolio summary section from brokerage statement text.
 * Returns null if no portfolio section is found.
 */
function extractPortfolioSection(text: string): string | null {
  // Look for portfolio summary markers
  const markers = [
    "PORTFOLIO SUMMARY",
    "Portfolio Summary",
    "EQUITIES / OPTIONS",
    "EQUITIES/OPTIONS",
  ];

  let start = -1;
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx >= 0) {
      start = idx;
      break;
    }
  }

  if (start < 0) return null;

  // Find the end — typically "ACCOUNT ACTIVITY" or "Total Equities" or end of holdings
  const endMarkers = [
    "ACCOUNT ACTIVITY",
    "Account Activity",
    "BUY / SELL TRANSACTIONS",
    "ANNOUNCEMENTS",
  ];

  let end = text.length;
  for (const marker of endMarkers) {
    const idx = text.indexOf(marker, start);
    if (idx >= 0 && idx < end) {
      end = idx;
    }
  }

  const section = text.slice(start, end);
  // Only return if it's substantial enough to contain holdings
  return section.length > 100 ? section : null;
}
