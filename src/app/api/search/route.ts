import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/yahoo";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }
  try {
    const results = await searchStocks(q);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
