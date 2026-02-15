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
