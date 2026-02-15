"use client";

import { useState, useCallback } from "react";
import { Upload, Loader2 } from "lucide-react";
import type { PortfolioItem } from "@/lib/types";

interface PortfolioDropZoneProps {
  onExtracted: (items: PortfolioItem[]) => void;
}

export function PortfolioDropZone({ onExtracted }: PortfolioDropZoneProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        const dataUrl = `data:${file.type};base64,${base64}`;

        const res = await fetch("/api/extract-portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });

        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else if (data.holdings) {
          onExtracted(data.holdings);
        }
      } catch {
        setError("Failed to extract portfolio");
      } finally {
        setIsLoading(false);
      }
    },
    [onExtracted]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        processFile(file);
      }
    },
    [processFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer ${
        isDragOver ? "border-amber-400 bg-amber-400/5" : "border-border hover:border-muted-foreground"
      }`}
    >
      <label className="cursor-pointer flex flex-col items-center gap-1">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground">
          {isLoading ? "Extracting..." : "Drop screenshot"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
        />
      </label>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
