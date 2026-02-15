import {
  calculateRSI,
  getSMAPair,
  volumeSpike,
  calculateMACD,
  getEMAPair,
  calculateBollingerBands,
  largeDailyMove,
} from "./indicators";
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

  // MACD crossover (histogram sign flip)
  const macd = calculateMACD(closes);
  if (macd) {
    if (macd.prevHistogram <= 0 && macd.histogram > 0) {
      signals.push({
        ticker,
        signal: "MACD Bullish Crossover",
        type: "swing",
        value: Math.round(macd.histogram * 1000) / 1000,
        description: `MACD histogram flipped positive — bullish momentum shift`,
      });
    } else if (macd.prevHistogram >= 0 && macd.histogram < 0) {
      signals.push({
        ticker,
        signal: "MACD Bearish Crossover",
        type: "swing",
        value: Math.round(macd.histogram * 1000) / 1000,
        description: `MACD histogram flipped negative — bearish momentum shift`,
      });
    }
  }

  // 9/21 EMA crossover
  const ema9 = getEMAPair(closes, 9);
  const ema21 = getEMAPair(closes, 21);
  if (ema9 && ema21) {
    const [prev9, curr9] = ema9;
    const [prev21, curr21] = ema21;
    if (prev9 <= prev21 && curr9 > curr21) {
      signals.push({
        ticker,
        signal: "9/21 EMA Bullish Cross",
        type: "swing",
        value: Math.round(curr9 * 100) / 100,
        description: `9-day EMA ($${curr9.toFixed(2)}) crossed above 21-day EMA ($${curr21.toFixed(2)})`,
      });
    } else if (prev9 >= prev21 && curr9 < curr21) {
      signals.push({
        ticker,
        signal: "9/21 EMA Bearish Cross",
        type: "swing",
        value: Math.round(curr9 * 100) / 100,
        description: `9-day EMA ($${curr9.toFixed(2)}) crossed below 21-day EMA ($${curr21.toFixed(2)})`,
      });
    }
  }

  // Bollinger Band breakout
  const bb = calculateBollingerBands(closes);
  if (bb) {
    const price = closes[closes.length - 1];
    if (price > bb.upper) {
      signals.push({
        ticker,
        signal: "Bollinger Upper Breakout",
        type: "attention",
        value: Math.round(bb.percentB * 100) / 100,
        description: `Price ($${price.toFixed(2)}) closed above upper Bollinger Band ($${bb.upper.toFixed(2)})`,
      });
    } else if (price < bb.lower) {
      signals.push({
        ticker,
        signal: "Bollinger Lower Breakout",
        type: "attention",
        value: Math.round(bb.percentB * 100) / 100,
        description: `Price ($${price.toFixed(2)}) closed below lower Bollinger Band ($${bb.lower.toFixed(2)})`,
      });
    }
  }

  // Large daily move (>3%)
  const move = largeDailyMove(closes);
  if (move?.isLarge) {
    signals.push({
      ticker,
      signal: move.changePercent > 0 ? "Large Rally" : "Large Drop",
      type: "attention",
      value: Math.round(move.changePercent * 100) / 100,
      description: `Price moved ${move.changePercent > 0 ? "+" : ""}${move.changePercent.toFixed(1)}% in one day`,
    });
  }

  return signals;
}
