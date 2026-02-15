import type {
  IncomeStatement,
  KeyMetric,
  ProjectionYearInput,
  ProjectionRow,
  ProjectionCase,
  DCFInputs,
  DCFResult,
  CashFlowStatement,
  BalanceSheetStatement,
} from "./types";

export function computeProjections(
  inputs: ProjectionYearInput[],
  baseRevenue: number,
  sharesOutstanding: number
): ProjectionRow[] {
  const rows: ProjectionRow[] = [];
  let prevRevenue = baseRevenue;

  for (let i = 0; i < inputs.length; i++) {
    const { revGrowth, netMargin, peHigh, peLow } = inputs[i];
    const revenue = prevRevenue * (1 + revGrowth / 100);
    const netIncome = revenue * (netMargin / 100);
    const eps = sharesOutstanding > 0 ? netIncome / sharesOutstanding : 0;
    const sharePriceHigh = eps * peHigh;
    const sharePriceLow = eps * peLow;

    rows.push({
      year: i + 1,
      revenue,
      revGrowth,
      netIncome,
      netMargin,
      eps,
      peHigh,
      peLow,
      sharePriceHigh,
      sharePriceLow,
    });

    prevRevenue = revenue;
  }

  return rows;
}

export function computeCAGR(currentPrice: number, futurePrice: number, years: number): number {
  if (currentPrice <= 0 || futurePrice <= 0 || years <= 0) return 0;
  return (Math.pow(futurePrice / currentPrice, 1 / years) - 1) * 100;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function deriveProjectionCases(
  incomeStatements: IncomeStatement[],
  keyMetrics: KeyMetric[]
): { base: ProjectionCase; bull: ProjectionCase; bear: ProjectionCase } {
  // Income statements come newest first — reverse for chronological
  const sorted = [...incomeStatements].reverse();

  // Calculate year-over-year revenue growth rates
  const growthRates: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].revenue > 0) {
      growthRates.push(((sorted[i].revenue - sorted[i - 1].revenue) / sorted[i - 1].revenue) * 100);
    }
  }

  // Net income margins
  const margins = sorted.filter((s) => s.revenue > 0).map((s) => (s.netIncome / s.revenue) * 100);

  // PE ratios from key metrics
  const peRatios = keyMetrics.map((k) => k.peRatio).filter((p) => p > 0 && isFinite(p));

  // Recent 3 years for base case
  const recentGrowth = growthRates.slice(-3);
  const recentMargins = margins.slice(-3);

  const baseGrowth = avg(recentGrowth) || 10;
  const baseMargin = avg(recentMargins) || 10;
  const basePeHigh = avg(peRatios) || 20;
  const basePeLow = basePeHigh * 0.6;

  const bullGrowth = growthRates.length > 0 ? Math.max(...growthRates) : baseGrowth * 1.5;
  const bullMargin = margins.length > 0 ? Math.max(...margins) : baseMargin * 1.3;
  const bullPeHigh = peRatios.length > 0 ? Math.max(...peRatios) : basePeHigh * 1.3;
  const bullPeLow = bullPeHigh * 0.7;

  const bearGrowth = growthRates.length > 0 ? Math.min(...growthRates) : baseGrowth * 0.5;
  const bearMargin = margins.length > 0 ? Math.min(...margins) : baseMargin * 0.7;
  const bearPeHigh = peRatios.length > 0 ? Math.min(...peRatios) : basePeHigh * 0.7;
  const bearPeLow = bearPeHigh * 0.6;

  const makeYears = (g: number, m: number, ph: number, pl: number): ProjectionYearInput[] =>
    Array.from({ length: 5 }, () => ({
      revGrowth: Math.round(g * 10) / 10,
      netMargin: Math.round(m * 10) / 10,
      peHigh: Math.round(ph * 10) / 10,
      peLow: Math.round(pl * 10) / 10,
    }));

  return {
    base: { years: makeYears(baseGrowth, baseMargin, basePeHigh, basePeLow) },
    bull: { years: makeYears(bullGrowth, bullMargin, bullPeHigh, bullPeLow) },
    bear: { years: makeYears(bearGrowth, bearMargin, bearPeHigh, bearPeLow) },
  };
}

// ---------------------------------------------------------------------------
// 10-Year Discounted Cash Flow Engine
// ---------------------------------------------------------------------------

export function computeDCF(
  baseFCF: number,
  cashAndEquivalents: number,
  totalDebt: number,
  sharesOutstanding: number,
  currentPrice: number,
  inputs: DCFInputs
): DCFResult {
  const { discountRate, perpetualGrowthRate, fcfGrowthRate, projectionYears } = inputs;
  const r = discountRate / 100;
  const g = fcfGrowthRate / 100;
  const gPerp = perpetualGrowthRate / 100;
  const n = projectionYears;

  // Step 1: Project future FCFs and discount each to present value
  const projectedFCFs: number[] = [];
  const presentValues: number[] = [];
  let fcf = baseFCF;

  for (let year = 1; year <= n; year++) {
    fcf = fcf * (1 + g);
    projectedFCFs.push(fcf);

    const pv = fcf / Math.pow(1 + r, year);
    presentValues.push(pv);
  }

  const totalPVofFCFs = presentValues.reduce((sum, pv) => sum + pv, 0);

  // Step 2: Terminal Value using Gordon Growth Model
  //   TV = FCF_n * (1 + gPerp) / (r - gPerp)
  const terminalFCF = projectedFCFs[n - 1];
  const terminalValue = r > gPerp
    ? (terminalFCF * (1 + gPerp)) / (r - gPerp)
    : 0;

  // Discount terminal value back to present
  const pvOfTerminalValue = terminalValue / Math.pow(1 + r, n);

  // Step 3: Enterprise Value = PV of FCFs + PV of Terminal Value
  const enterpriseValue = totalPVofFCFs + pvOfTerminalValue;

  // Step 4: Equity Value = EV + Cash - Debt
  const equityValue = enterpriseValue + cashAndEquivalents - totalDebt;

  // Step 5: Intrinsic Value per Share
  const intrinsicValuePerShare = sharesOutstanding > 0
    ? equityValue / sharesOutstanding
    : 0;

  // Step 6: Margin of Safety (% upside from current price)
  const marginOfSafety = currentPrice > 0
    ? ((intrinsicValuePerShare - currentPrice) / currentPrice) * 100
    : 0;

  return {
    projectedFCFs,
    presentValues,
    totalPVofFCFs,
    terminalValue,
    pvOfTerminalValue,
    enterpriseValue,
    equityValue,
    intrinsicValuePerShare,
    marginOfSafety,
  };
}

// Derive sensible DCF defaults from historical data
export function deriveDCFInputs(
  cashFlowStatements: CashFlowStatement[],
  balanceSheetStatements: BalanceSheetStatement[]
): { baseFCF: number; cash: number; debt: number; defaults: DCFInputs } {
  // Most recent = index 0 (FMP returns newest first)
  const latestCF = cashFlowStatements[0];
  const latestBS = balanceSheetStatements[0];

  const baseFCF = latestCF?.freeCashFlow ?? 0;
  const cash = latestBS?.cashAndCashEquivalents ?? 0;
  const debt = latestBS?.totalDebt ?? 0;

  // Historical FCF growth rate (avg YoY from available data)
  const sorted = [...cashFlowStatements].reverse(); // chronological
  const fcfGrowths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].freeCashFlow;
    const curr = sorted[i].freeCashFlow;
    if (prev > 0 && curr > 0) {
      fcfGrowths.push(((curr - prev) / prev) * 100);
    }
  }

  const historicalFCFGrowth = fcfGrowths.length > 0
    ? avg(fcfGrowths)
    : 10;

  // Clamp to reasonable range
  const clampedGrowth = Math.max(-5, Math.min(50, historicalFCFGrowth));

  return {
    baseFCF,
    cash,
    debt,
    defaults: {
      discountRate: 10,
      perpetualGrowthRate: 3,
      fcfGrowthRate: Math.round(clampedGrowth * 10) / 10,
      projectionYears: 10,
    },
  };
}
