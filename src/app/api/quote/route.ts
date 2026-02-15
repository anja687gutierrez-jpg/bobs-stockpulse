import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/yahoo";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  try {
    const quote = await getQuote(symbol);
    return NextResponse.json(quote);
  } catch {
    return NextResponse.json({ error: "Quote fetch failed" }, { status: 500 });
  }
}
