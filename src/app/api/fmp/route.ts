import { NextRequest, NextResponse } from "next/server";
import { fetchFmp, isAllowedEndpoint } from "@/lib/fmp";

export async function GET(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get("endpoint");
  const symbol = req.nextUrl.searchParams.get("symbol");

  if (!endpoint || !symbol) {
    return NextResponse.json({ error: "endpoint and symbol required" }, { status: 400 });
  }

  if (!isAllowedEndpoint(endpoint)) {
    return NextResponse.json({ error: "Endpoint not allowed" }, { status: 403 });
  }

  try {
    const data = await fetchFmp(endpoint, symbol);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "FMP fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
