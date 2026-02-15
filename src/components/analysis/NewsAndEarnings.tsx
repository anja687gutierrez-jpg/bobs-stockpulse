"use client";

import type { NewsArticle } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, ExternalLink } from "lucide-react";

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1d ago" : `${days}d ago`;
}

interface Props {
  news: NewsArticle[];
  isLoading: boolean;
  symbol: string;
}

export function NewsAndEarnings({ news, isLoading, symbol }: Props) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-amber-400" />
          <CardTitle className="text-lg">News &amp; Narrative — {symbol}</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Latest headlines from Yahoo Finance. Context is automatically fed to the AI chat.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-4 w-4 mt-1 shrink-0 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent news found for {symbol}.</p>
        ) : (
          <ul className="space-y-3">
            {news.map((article, i) => (
              <li key={i} className="group">
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 items-start hover:bg-secondary/50 rounded-lg p-2 -mx-2 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-amber-400 shrink-0 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug group-hover:text-amber-400 transition-colors">
                      {article.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {article.publisher}
                      {article.publishedAt && ` · ${timeAgo(article.publishedAt)}`}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
