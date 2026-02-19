"use client";

import { useState, useCallback } from "react";
import { Upload, Loader2 } from "lucide-react";
import type { PortfolioItem } from "@/lib/types";

interface PortfolioDropZoneProps {
  onExtracted: (items: PortfolioItem[]) => void;
}

const MAX_SCREENSHOTS = 3;

export function PortfolioDropZone({ onExtracted }: PortfolioDropZoneProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File): Promise<PortfolioItem[]> => {
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
      if (data.error) throw new Error(data.error);
      return data.holdings ?? [];
    },
    []
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      setIsLoading(true);
      setError(null);
      setWarning(null);

      let toProcess = files;
      if (toProcess.length > MAX_SCREENSHOTS) {
        toProcess = toProcess.slice(0, MAX_SCREENSHOTS);
        setWarning(`Processing first ${MAX_SCREENSHOTS} screenshots — upload more after`);
      }

      try {
        const settled = await Promise.allSettled(toProcess.map(processFile));
        const allHoldings: PortfolioItem[] = [];
        let failures = 0;
        for (const result of settled) {
          if (result.status === "fulfilled") {
            allHoldings.push(...result.value);
          } else {
            failures++;
          }
        }
        if (allHoldings.length === 0) {
          setError(failures > 0 ? `${failures} screenshot(s) failed` : "No stock tickers found");
        } else {
          if (failures > 0) setError(`${failures} screenshot(s) failed, got ${allHoldings.length} tickers from the rest`);
          onExtracted(allHoldings);
        }
      } catch {
        setError("Failed to extract portfolio");
      } finally {
        setIsLoading(false);
      }
    },
    [processFile, onExtracted]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const images = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (images.length > 0) processFiles(images);
    },
    [processFiles]
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
          {isLoading ? "Extracting..." : "Drop screenshot(s)"}
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) processFiles(files);
          }}
        />
      </label>
      {warning && <p className="text-xs text-amber-400 mt-1">{warning}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
