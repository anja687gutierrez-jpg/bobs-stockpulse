"use client";

import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useStockContext } from "@/components/StockProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceCommand, type CommandAction } from "@/hooks/useVoiceCommand";

interface VoiceButtonProps {
  onSearchQuery: (query: string) => void;
}

export function VoiceButton({ onSearchQuery }: VoiceButtonProps) {
  const router = useRouter();
  const { selectedSymbol, portfolio, createAlert } = useStockContext();
  const { signOut } = useAuth();

  const handleCommand = async (action: CommandAction) => {
    switch (action.type) {
      case "search":
        toast.info(`Searching for "${action.query}"...`);
        onSearchQuery(action.query);
        break;

      case "navigate": {
        const routes: Record<string, string> = {
          analysis: "/",
          metrics: "/metrics",
          compare: "/compare",
        };
        const path = routes[action.page];
        if (path) {
          toast.info(`Navigating to ${action.page}...`);
          router.push(path);
        }
        break;
      }

      case "add_favorite":
        if (selectedSymbol) {
          portfolio.addTicker(selectedSymbol);
          toast.success(`Added ${selectedSymbol} to favorites`);
        } else {
          toast.warning("Select a stock first");
        }
        break;

      case "remove_favorite":
        if (selectedSymbol) {
          portfolio.removeTicker(selectedSymbol);
          toast.success(`Removed ${selectedSymbol} from favorites`);
        } else {
          toast.warning("Select a stock first");
        }
        break;

      case "set_alert":
        if (selectedSymbol) {
          createAlert({
            ticker: selectedSymbol,
            targetPrice: action.price,
            direction: action.direction,
          });
          toast.success(
            `Alert set: ${selectedSymbol} ${action.direction} $${action.price}`
          );
        } else {
          toast.warning("Select a stock first");
        }
        break;

      case "sign_out":
        toast.info("Signing out...");
        await signOut();
        break;
    }
  };

  const { isListening, transcript, startListening, stopListening, isSupported } =
    useVoiceCommand({ onCommand: handleCommand });

  if (!isSupported) return null;

  return (
    <div className="relative">
      <button
        onClick={isListening ? stopListening : startListening}
        className={`relative flex items-center justify-center h-9 w-9 rounded-lg transition-colors ${
          isListening
            ? "bg-red-500/20 text-red-400"
            : "bg-secondary text-amber-400 hover:bg-accent"
        }`}
        title={isListening ? "Stop listening" : "Voice command"}
      >
        {isListening && (
          <span className="absolute inset-0 rounded-lg border-2 border-red-400 animate-pulse" />
        )}
        {isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>

      {isListening && transcript && (
        <div className="absolute right-0 bottom-full mb-2 px-3 py-1.5 bg-card border border-border rounded-lg shadow-xl text-sm text-muted-foreground whitespace-nowrap max-w-64 truncate">
          {transcript}
        </div>
      )}
    </div>
  );
}
