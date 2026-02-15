import type { MetricDefinition } from "./types";

export const METRICS: MetricDefinition[] = [
  {
    key: "peRatio",
    label: "P/E Ratio",
    description: "Price relative to earnings per share",
    format: "ratio",
    ranges: { excellent: [0, 15], good: [15, 25], fair: [25, 40], poor: [40, 1000] },
    higherIsBetter: false,
  },
  {
    key: "priceToSalesRatio",
    label: "P/S Ratio",
    description: "Price relative to revenue per share",
    format: "ratio",
    ranges: { excellent: [0, 3], good: [3, 8], fair: [8, 15], poor: [15, 100] },
    higherIsBetter: false,
  },
  {
    key: "pbRatio",
    label: "P/B Ratio",
    description: "Price relative to book value per share",
    format: "ratio",
    ranges: { excellent: [0, 3], good: [3, 6], fair: [6, 10], poor: [10, 100] },
    higherIsBetter: false,
  },
  {
    key: "returnOnEquity",
    label: "ROE",
    description: "Net income as a percentage of shareholder equity",
    format: "percent",
    ranges: { excellent: [20, 100], good: [15, 20], fair: [10, 15], poor: [0, 10] },
    higherIsBetter: true,
  },
  {
    key: "returnOnAssets",
    label: "ROA",
    description: "Net income as a percentage of total assets",
    format: "percent",
    ranges: { excellent: [10, 100], good: [5, 10], fair: [2, 5], poor: [0, 2] },
    higherIsBetter: true,
  },
  {
    key: "debtToEquity",
    label: "Debt/Equity",
    description: "Total debt relative to shareholder equity",
    format: "ratio",
    ranges: { excellent: [0, 0.5], good: [0.5, 1], fair: [1, 2], poor: [2, 100] },
    higherIsBetter: false,
  },
  {
    key: "currentRatio",
    label: "Current Ratio",
    description: "Current assets divided by current liabilities",
    format: "ratio",
    ranges: { excellent: [2, 10], good: [1.5, 2], fair: [1, 1.5], poor: [0, 1] },
    higherIsBetter: true,
  },
  {
    key: "revenuePerShare",
    label: "Revenue/Share",
    description: "Revenue per diluted share",
    format: "currency",
    ranges: { excellent: [50, 10000], good: [20, 50], fair: [5, 20], poor: [0, 5] },
    higherIsBetter: true,
  },
  {
    key: "netIncomePerShare",
    label: "Net Income/Share",
    description: "Net income per diluted share",
    format: "currency",
    ranges: { excellent: [10, 10000], good: [3, 10], fair: [1, 3], poor: [0, 1] },
    higherIsBetter: true,
  },
  {
    key: "freeCashFlowPerShare",
    label: "FCF/Share",
    description: "Free cash flow per diluted share",
    format: "currency",
    ranges: { excellent: [10, 10000], good: [3, 10], fair: [1, 3], poor: [0, 1] },
    higherIsBetter: true,
  },
  {
    key: "dividendYield",
    label: "Dividend Yield",
    description: "Annual dividend as a percentage of price",
    format: "percent",
    ranges: { excellent: [3, 10], good: [2, 3], fair: [0.5, 2], poor: [0, 0.5] },
    higherIsBetter: true,
  },
  {
    key: "enterpriseValueOverEBITDA",
    label: "EV/EBITDA",
    description: "Enterprise value relative to EBITDA",
    format: "ratio",
    ranges: { excellent: [0, 10], good: [10, 15], fair: [15, 25], poor: [25, 200] },
    higherIsBetter: false,
  },
];

export function getRating(metric: MetricDefinition, value: number): "excellent" | "good" | "fair" | "poor" {
  for (const rating of ["excellent", "good", "fair", "poor"] as const) {
    const [min, max] = metric.ranges[rating];
    if (value >= min && value < max) return rating;
  }
  return "poor";
}

export const RATING_COLORS = {
  excellent: "text-emerald-400",
  good: "text-amber-400",
  fair: "text-orange-400",
  poor: "text-red-400",
} as const;

export const RATING_BG = {
  excellent: "bg-emerald-400/10",
  good: "bg-amber-400/10",
  fair: "bg-orange-400/10",
  poor: "bg-red-400/10",
} as const;
