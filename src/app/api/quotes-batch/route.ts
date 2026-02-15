import { NextRequest, NextResponse } from "next/server";
import { getQuotesBatch } from "@/lib/yahoo";

export async function POST(req: NextRequest) {
  try {
    const { symbols } = await req.json();
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: "symbols array required" }, { status: 400 });
    }

    const quotes = await getQuotesBatch(symbols.slice(0, 100));
    return NextResponse.json({ quotes });
  } catch {
    return NextResponse.json({ error: "Batch quote fetch failed" }, { status: 500 });
  }
}
