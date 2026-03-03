import { NextRequest, NextResponse } from "next/server";

function decodeJwtEmail(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Base64url → Base64 → decode
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(payload, "base64").toString("utf-8");
    const claims = JSON.parse(json) as Record<string, unknown>;
    return typeof claims.email === "string" ? claims.email : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Auth guard: require a Firebase ID token in the Authorization header
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tokenEmail = decodeJwtEmail(token);
    if (!tokenEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, html } = await req.json();

    if (!subject || !html) {
      return NextResponse.json({ error: "Missing subject or html" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "StockPulse <notifications@goiconicway.com>",
        to: [tokenEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      return NextResponse.json({ error: body.message ?? res.statusText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ id: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
