import { streamText } from "ai";
import { groq } from "@ai-sdk/groq";

export async function POST(req: Request) {
  const { messages, stockContext, dcfContext, newsContext } = await req.json();

  let systemPrompt = `You are Bob's StockPulse AI — a sharp, concise stock analysis assistant embedded in an interactive projection and DCF tool. You help users with fundamental analysis, DCF modeling, the "1000X Stocks" methodology, and value investing. Keep answers focused, data-driven, and under 200 words unless the user asks for depth. Use $ formatting for prices and B/T for large numbers.`;

  if (stockContext) {
    systemPrompt += `\n\nCURRENT STOCK: ${stockContext.symbol} trading at $${stockContext.price}. Market cap: ${stockContext.marketCap}.`;
  }

  if (dcfContext) {
    systemPrompt += `\n\nDCF ANALYSIS: Intrinsic value per share: $${dcfContext.intrinsicValue}. Current price: $${dcfContext.currentPrice}. Margin of safety: ${dcfContext.marginOfSafety}%. The stock appears ${dcfContext.isUndervalued ? "UNDERVALUED" : "OVERVALUED"} based on DCF.`;
  }

  if (newsContext && newsContext.length > 0) {
    systemPrompt += `\n\nRECENT NEWS HEADLINES:\n${newsContext.map((n: { title: string }) => `- ${n.title}`).join("\n")}`;
  }

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
