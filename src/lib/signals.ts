import { calculateRSI, getSMAPair, volumeSpike } from "./indicators";
import type { TechnicalSignal } from "./types";

interface HistoricalDay {
  close: number;
  volume: number;
}

/**
 * Check all technical signals for a single ticker.
 * `history` must be sorted oldest → newest, with at least 220 entries.
 */
export function checkTechnicalSignals(
  ticker: string,
  history: HistoricalDay[]
): TechnicalSignal[] {
  const signals: TechnicalSignal[] = [];
  const closes = history.map((d) => d.close);
  const volumes = history.map((d) => d.volume);

  // RSI (14-period)
  const rsi = calculateRSI(closes);
  if (rsi != null) {
    if (rsi < 30) {
      signals.push({
        ticker,
        signal: "RSI Oversold",
        type: "buy",
        value: Math.round(rsi * 100) / 100,
        description: `RSI at ${rsi.toFixed(1)} — oversold territory (below 30)`,
      });
    } else if (rsi > 70) {
      signals.push({
        ticker,
        signal: "RSI Overbought",
        type: "sell",
        value: Math.round(rsi * 100) / 100,
        description: `RSI at ${rsi.toFixed(1)} — overbought territory (above 70)`,
      });
    }
  }

  // Golden / Death Cross (50-day vs 200-day SMA)
  const sma50 = getSMAPair(closes, 50);
  const sma200 = getSMAPair(closes, 200);
  if (sma50 && sma200) {
    const [prev50, curr50] = sma50;
    const [prev200, curr200] = sma200;
    // Golden cross: 50 SMA crosses above 200 SMA
    if (prev50 <= prev200 && curr50 > curr200) {
      signals.push({
        ticker,
        signal: "Golden Cross",
        type: "buy",
        value: Math.round(curr50 * 100) / 100,
        description: `50-day SMA ($${curr50.toFixed(2)}) crossed above 200-day SMA ($${curr200.toFixed(2)})`,
      });
    }
    // Death cross: 50 SMA crosses below 200 SMA
    if (prev50 >= prev200 && curr50 < curr200) {
      signals.push({
        ticker,
        signal: "Death Cross",
        type: "sell",
        value: Math.round(curr50 * 100) / 100,
        description: `50-day SMA ($${curr50.toFixed(2)}) crossed below 200-day SMA ($${curr200.toFixed(2)})`,
      });
    }
  }

  // Volume spike (2x 20-day average)
  const vol = volumeSpike(volumes);
  if (vol?.isSpike) {
    signals.push({
      ticker,
      signal: "Volume Spike",
      type: "attention",
      value: Math.round(vol.ratio * 100) / 100,
      description: `Volume is ${vol.ratio.toFixed(1)}x the 20-day average`,
    });
  }

  return signals;
}
