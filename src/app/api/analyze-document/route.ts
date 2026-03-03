import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

const MAX_TEXT_LENGTH = 8000;

export async function POST(req: NextRequest) {
  try {
    const { file } = await req.json();
    if (!file || typeof file !== "string") {
      return NextResponse.json({ error: "Base64 PDF required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    // Decode base64 PDF
    const base64Data = file.replace(/^data:application\/pdf;base64,/, "");
    const pdfBuffer = Buffer.from(base64Data, "base64");

    // Extract text from PDF (dynamic import for CJS compatibility)
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(pdfBuffer);
    const text = parsed.text.slice(0, MAX_TEXT_LENGTH);

    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract text from PDF" }, { status: 400 });
    }

    const { text: analysis } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: `You are a senior financial analyst. Analyze the following document excerpt and provide a structured breakdown. Use markdown formatting with headers and bullet points.

Include these sections where applicable:
- **Key Metrics** — revenue, EPS, margins, growth rates
- **Revenue & Earnings Trends** — quarter-over-quarter and year-over-year changes
- **Risks & Concerns** — red flags, headwinds, uncertainties
- **Notable Changes** — management shifts, strategy pivots, guidance updates
- **Investment Implications** — what this means for investors, bull/bear case

Be concise but thorough. If the document is not financial in nature, say so and summarize what you can.`,
      prompt: text,
    });

    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Document analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
