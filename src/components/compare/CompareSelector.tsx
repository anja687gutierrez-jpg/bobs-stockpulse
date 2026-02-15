"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface CompareSelectorProps {
  symbols: string[];
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

export function CompareSelector({ symbols, onAdd, onRemove }: CompareSelectorProps) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const sym = input.trim().toUpperCase();
    if (sym && symbols.length < 3 && !symbols.includes(sym)) {
      onAdd(sym);
      setInput("");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Enter ticker..."
          className="w-36 bg-secondary border-border font-mono"
          maxLength={5}
        />
        <Button
          onClick={handleAdd}
          disabled={symbols.length >= 3}
          size="sm"
          variant="secondary"
          className="border border-amber-400/20 text-amber-400 hover:bg-amber-400/10"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-2">
        {symbols.map((s) => (
          <Badge key={s} variant="secondary" className="gap-1 text-sm font-mono bg-amber-400/10 text-amber-400">
            {s}
            <button onClick={() => onRemove(s)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {symbols.length >= 3 && (
        <span className="text-xs text-muted-foreground">Max 3 stocks</span>
      )}
    </div>
  );
}
