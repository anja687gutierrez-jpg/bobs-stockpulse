/** Technical indicator calculations from price/volume arrays (oldest → newest). */

export function calculateRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) avgGain += delta;
    else avgLoss += Math.abs(delta);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateSMA(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

/** Returns [previousSMA, currentSMA] for crossover detection. */
export function getSMAPair(
  closes: number[],
  period: number
): [number, number] | null {
  if (closes.length < period + 1) return null;
  const prev = calculateSMA(closes.slice(0, -1), period);
  const curr = calculateSMA(closes, period);
  if (prev == null || curr == null) return null;
  return [prev, curr];
}

export function calculateEMA(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

/** Returns [previousEMA, currentEMA] for crossover detection. */
export function getEMAPair(
  closes: number[],
  period: number
): [number, number] | null {
  if (closes.length < period + 1) return null;
  const prev = calculateEMA(closes.slice(0, -1), period);
  const curr = calculateEMA(closes, period);
  if (prev == null || curr == null) return null;
  return [prev, curr];
}

export function calculateMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): { macdLine: number; signalLine: number; histogram: number; prevHistogram: number } | null {
  if (closes.length < slow + signalPeriod + 1) return null;

  // Build MACD line series
  const k_fast = 2 / (fast + 1);
  const k_slow = 2 / (slow + 1);

  let emaFast = closes.slice(0, fast).reduce((s, v) => s + v, 0) / fast;
  let emaSlow = closes.slice(0, slow).reduce((s, v) => s + v, 0) / slow;

  const macdSeries: number[] = [];
  for (let i = slow; i < closes.length; i++) {
    emaFast = closes[i] * k_fast + emaFast * (1 - k_fast);
    emaSlow = closes[i] * k_slow + emaSlow * (1 - k_slow);
    macdSeries.push(emaFast - emaSlow);
  }

  if (macdSeries.length < signalPeriod + 1) return null;

  // Signal line is EMA of MACD series
  const k_sig = 2 / (signalPeriod + 1);
  let signalLine =
    macdSeries.slice(0, signalPeriod).reduce((s, v) => s + v, 0) / signalPeriod;
  for (let i = signalPeriod; i < macdSeries.length; i++) {
    signalLine = macdSeries[i] * k_sig + signalLine * (1 - k_sig);
  }

  const macdLine = macdSeries[macdSeries.length - 1];
  const histogram = macdLine - signalLine;

  // Previous histogram
  const prevMacd = macdSeries[macdSeries.length - 2];
  let prevSignal =
    macdSeries.slice(0, signalPeriod).reduce((s, v) => s + v, 0) / signalPeriod;
  for (let i = signalPeriod; i < macdSeries.length - 1; i++) {
    prevSignal = macdSeries[i] * k_sig + prevSignal * (1 - k_sig);
  }
  const prevHistogram = prevMacd - prevSignal;

  return { macdLine, signalLine, histogram, prevHistogram };
}

export function calculateBollingerBands(
  closes: number[],
  period = 20,
  mult = 2
): { upper: number; lower: number; bandwidth: number; percentB: number } | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const mean = slice.reduce((s, v) => s + v, 0) / period;
  const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  const upper = mean + mult * stdDev;
  const lower = mean - mult * stdDev;
  const bandwidth = upper - lower;
  const current = closes[closes.length - 1];
  const percentB = bandwidth === 0 ? 0.5 : (current - lower) / bandwidth;
  return { upper, lower, bandwidth, percentB };
}

export function largeDailyMove(
  closes: number[],
  threshold = 3
): { isLarge: boolean; changePercent: number } | null {
  if (closes.length < 2) return null;
  const prev = closes[closes.length - 2];
  const curr = closes[closes.length - 1];
  if (prev === 0) return null;
  const changePercent = ((curr - prev) / prev) * 100;
  return { isLarge: Math.abs(changePercent) >= threshold, changePercent };
}

export function near52WeekExtreme(
  high52: number,
  low52: number,
  currentPrice: number,
  threshold = 0.02
): { nearHigh: boolean; nearLow: boolean } {
  const nearHigh = high52 > 0 && (high52 - currentPrice) / high52 <= threshold;
  const nearLow = low52 > 0 && (currentPrice - low52) / low52 <= threshold;
  return { nearHigh, nearLow };
}

export function volumeSpike(
  volumes: number[],
  avgPeriod = 20,
  threshold = 2
): { isSpike: boolean; ratio: number } | null {
  if (volumes.length < avgPeriod + 1) return null;
  const recent = volumes.slice(-(avgPeriod + 1));
  const avg =
    recent.slice(0, avgPeriod).reduce((s, v) => s + v, 0) / avgPeriod;
  if (avg === 0) return null;
  const current = recent[avgPeriod];
  const ratio = current / avg;
  return { isSpike: ratio >= threshold, ratio };
}
