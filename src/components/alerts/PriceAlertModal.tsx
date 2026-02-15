"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell } from "lucide-react";
import { toast } from "sonner";

interface PriceAlertModalProps {
  ticker: string;
  currentPrice: number;
  onCreateAlert: (alert: { ticker: string; targetPrice: number; direction: "above" | "below" }) => void;
}

export function PriceAlertModal({ ticker, currentPrice, onCreateAlert }: PriceAlertModalProps) {
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;
    onCreateAlert({ ticker, targetPrice: price, direction });
    toast.success("Alert created", {
      description: `${ticker} ${direction} $${price.toFixed(2)}`,
    });
    setOpen(false);
    setTargetPrice("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1 hover:bg-accent rounded transition-colors" title="Set price alert">
          <Bell className="h-4 w-4 text-muted-foreground hover:text-amber-400" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Price Alert for <span className="text-amber-400 font-mono">{ticker}</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Current price: <span className="text-foreground font-mono">${currentPrice.toFixed(2)}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-price">Target Price</Label>
            <Input
              id="target-price"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="bg-secondary border-border font-mono"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Trigger when price goes</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={direction === "above" ? "default" : "secondary"}
                onClick={() => setDirection("above")}
                className={direction === "above" ? "bg-emerald-600 hover:bg-emerald-500" : ""}
              >
                Above
              </Button>
              <Button
                type="button"
                size="sm"
                variant={direction === "below" ? "default" : "secondary"}
                onClick={() => setDirection("below")}
                className={direction === "below" ? "bg-red-600 hover:bg-red-500" : ""}
              >
                Below
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-amber-400 text-black hover:bg-amber-300 font-semibold"
          >
            Create Alert
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
