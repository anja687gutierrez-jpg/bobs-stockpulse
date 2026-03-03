"use client";

import { useState, useCallback } from "react";
import { Upload, Loader2 } from "lucide-react";
import type { PortfolioItem } from "@/lib/types";

interface PortfolioDropZoneProps {
  onExtracted: (items: PortfolioItem[]) => void;
  onDocumentAnalyzed: (analysis: string) => void;
}

const MAX_SCREENSHOTS = 3;

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.endsWith(".pdf");
}

export function PortfolioDropZone({ onExtracted, onDocumentAnalyzed }: PortfolioDropZoneProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<"image" | "pdf">("image");
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const toBase64 = useCallback(async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    return `data:${file.type};base64,${base64}`;
  }, []);

  const processImage = useCallback(
    async (file: File): Promise<PortfolioItem[]> => {
      const dataUrl = await toBase64(file);
      const res = await fetch("/api/extract-portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.holdings ?? [];
    },
    [toBase64]
  );

  const processPdf = useCallback(
    async (file: File) => {
      const dataUrl = await toBase64(file);
      const res = await fetch("/api/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: dataUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onDocumentAnalyzed(data.analysis);
    },
    [toBase64, onDocumentAnalyzed]
  );

  const processImages = useCallback(
    async (files: File[]) => {
      let toProcess = files;
      if (toProcess.length > MAX_SCREENSHOTS) {
        toProcess = toProcess.slice(0, MAX_SCREENSHOTS);
        setWarning(`Processing first ${MAX_SCREENSHOTS} screenshots — upload more after`);
      }

      const settled = await Promise.allSettled(toProcess.map(processImage));
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
    },
    [processImage, onExtracted]
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      setIsLoading(true);
      setError(null);
      setWarning(null);

      const pdfs = files.filter(isPdf);
      const images = files.filter((f) => f.type.startsWith("image/"));

      try {
        if (pdfs.length > 0) {
          setLoadingType("pdf");
          // Process first PDF only
          await processPdf(pdfs[0]);
        }
        if (images.length > 0) {
          setLoadingType("image");
          await processImages(images);
        }
        if (pdfs.length === 0 && images.length === 0) {
          setError("Unsupported file type — use images or PDFs");
        }
      } catch {
        setError(loadingType === "pdf" ? "Failed to analyze document" : "Failed to extract portfolio");
      } finally {
        setIsLoading(false);
      }
    },
    [processPdf, processImages, loadingType]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.type.startsWith("image/") || isPdf(f)
      );
      if (droppedFiles.length > 0) handleFiles(droppedFiles);
    },
    [handleFiles]
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
          {isLoading
            ? loadingType === "pdf"
              ? "Analyzing document..."
              : "Extracting..."
            : "Drop screenshot(s) or PDF"}
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) handleFiles(files);
            e.target.value = "";
          }}
        />
      </label>
      {warning && <p className="text-xs text-amber-400 mt-1">{warning}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
