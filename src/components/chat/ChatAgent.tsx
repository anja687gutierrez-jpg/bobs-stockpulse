"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useStockContext } from "@/components/StockProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, Bot, User, Minimize2, RotateCcw } from "lucide-react";
import { formatLargeNumber } from "@/lib/utils";
import { useDCF } from "@/hooks/useDCF";
import { useNews } from "@/hooks/useNews";

const GENERIC_PROMPTS = [
  "What's a 1000X stock?",
  "DCF vs P/E analysis",
  "Portfolio diversification rules",
  "Value investing checklist",
];

const STOCK_PROMPTS = [
  "Is {SYMBOL} fairly valued?",
  "Compare {SYMBOL} to peers",
  "What's driving {SYMBOL} news?",
  "Key risks for {SYMBOL}?",
];

const PORTFOLIO_PROMPTS = [
  "Rebalance my holdings?",
  "Check my concentration risk",
  "Best entry for new stock?",
  "How does {SYMBOL} fit my portfolio?",
];

export function ChatAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { selectedSymbol, quote, cashFlowStatements, balanceSheetStatements, portfolio } = useStockContext();

  const sharesOutstanding = quote?.sharesOutstanding ?? 0;
  const currentPrice = quote?.regularMarketPrice ?? 0;
  const dcf = useDCF(cashFlowStatements, balanceSheetStatements, sharesOutstanding, currentPrice);
  const { news } = useNews(selectedSymbol);

  const stockContext = selectedSymbol && quote
    ? {
        symbol: selectedSymbol,
        price: quote.regularMarketPrice.toFixed(2),
        marketCap: formatLargeNumber(quote.marketCap),
      }
    : null;

  const dcfContext = dcf.hasData && dcf.result.intrinsicValuePerShare > 0
    ? {
        intrinsicValue: dcf.result.intrinsicValuePerShare.toFixed(2),
        currentPrice: currentPrice.toFixed(2),
        marginOfSafety: dcf.result.marginOfSafety.toFixed(1),
        isUndervalued: dcf.result.marginOfSafety > 0,
      }
    : null;

  const newsContext = news.length > 0 ? news.slice(0, 5).map((n) => ({ title: n.title })) : null;

  const portfolioContext = portfolio.items.length > 0
    ? {
        holdings: portfolio.items.filter((i) => i.shares > 0).map((i) => ({ ticker: i.ticker, shares: i.shares })),
        currentPosition: selectedSymbol ? portfolio.items.find((i) => i.ticker === selectedSymbol && i.shares > 0) ?? null : null,
      }
    : null;

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/chat",
        body: { stockContext, dcfContext, newsContext, portfolioContext },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stockContext?.symbol, stockContext?.price, dcfContext?.intrinsicValue, news.length, portfolioContext?.holdings.length, portfolioContext?.currentPosition?.ticker]
  );

  const { messages: chatMessages, sendMessage, setMessages, status } = useChat({
    transport,
  });

  const handleNewChat = () => {
    setMessages([]);
  };

  // Build context-aware suggested prompts
  const suggestedPrompts = useMemo(() => {
    const sym = selectedSymbol ?? "AAPL";
    const hasHoldings = portfolio.items.some((i) => i.shares > 0);

    if (hasHoldings && selectedSymbol) {
      return PORTFOLIO_PROMPTS.map((p) => p.replace("{SYMBOL}", sym));
    }
    if (selectedSymbol) {
      return STOCK_PROMPTS.map((p) => p.replace("{SYMBOL}", sym));
    }
    return GENERIC_PROMPTS;
  }, [selectedSymbol, portfolio.items]);

  const welcomeText = "Hey — I'm your StockPulse AI. Ask me about any stock, valuation methodology, or the numbers you're seeing in the projection engine.";

  const allMessages = [
    { id: "welcome", role: "assistant" as const, text: welcomeText },
    ...chatMessages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      text: m.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") || "",
    })),
  ].filter((m) => m.text);

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue("");
    sendMessage({ text });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-amber-400 text-black shadow-lg shadow-amber-400/20 hover:bg-amber-300 transition-all hover:scale-105 flex items-center justify-center"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-96 bg-card border border-border rounded-xl shadow-2xl shadow-black/40 flex flex-col transition-all ${
        isMinimized ? "h-14" : "h-[520px]"
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border cursor-pointer shrink-0"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-amber-400/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <span className="text-sm font-semibold">StockPulse AI</span>
            {stockContext && (
              <span className="ml-2 text-xs text-amber-400 font-mono">{stockContext.symbol}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {chatMessages.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNewChat();
              }}
              className="p-1 hover:bg-accent rounded"
              title="New chat"
            >
              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="p-1 hover:bg-accent rounded"
          >
            <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="p-1 hover:bg-accent rounded"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {allMessages.map((m) => (
              <div key={m.id} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    m.role === "user" ? "bg-secondary" : "bg-amber-400/20"
                  }`}
                >
                  {m.role === "user" ? (
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-amber-400" />
                  )}
                </div>
                <div
                  className={`rounded-lg px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-amber-400/10 text-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {chatMessages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInputValue("");
                      sendMessage({ text: prompt });
                    }}
                    className="px-2.5 py-1 text-xs rounded-full border border-amber-400/25 text-amber-400/80 hover:bg-amber-400/10 hover:text-amber-400 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            {isLoading && allMessages[allMessages.length - 1]?.role === "user" && (
              <div className="flex gap-2.5">
                <div className="h-6 w-6 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="bg-secondary rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border shrink-0">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={stockContext ? `Ask about ${stockContext.symbol}...` : "Ask anything..."}
                className="flex-1 bg-secondary border-border text-sm"
              />
              <Button
                onClick={handleSend}
                size="sm"
                disabled={isLoading || !inputValue.trim()}
                className="bg-amber-400 text-black hover:bg-amber-300 px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
