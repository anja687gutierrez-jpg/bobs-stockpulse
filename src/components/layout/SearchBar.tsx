"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { Search } from "lucide-react";
import type { SearchResult } from "@/lib/types";

interface SearchBarProps {
  onSelect: (symbol: string) => void;
  externalQuery?: string;
}

export function SearchBar({ onSelect, externalQuery }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalQuery) {
      setQuery(externalQuery);
    }
  }, [externalQuery]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 1) {
      setResults([]);
      return;
    }

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setResults(data);
          setIsOpen(true);
        }
      })
      .catch(() => setResults([]));
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks..."
          className="pl-9 bg-secondary border-border"
        />
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          {results.map((r) => (
            <button
              key={r.symbol}
              className="w-full px-4 py-2.5 text-left hover:bg-accent flex items-center justify-between transition-colors"
              onClick={() => {
                onSelect(r.symbol);
                setQuery(r.symbol);
                setIsOpen(false);
              }}
            >
              <div>
                <span className="font-semibold text-amber-400">{r.symbol}</span>
                <span className="ml-2 text-sm text-muted-foreground">{r.shortname}</span>
              </div>
              <span className="text-xs text-muted-foreground">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
