export interface PortfolioItem {
  ticker: string;
  shares: number;
}

export interface StockQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  marketCap: number;
  sharesOutstanding: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  currency: string;
}

export interface SearchResult {
  symbol: string;
  shortname: string;
  exchange: string;
  quoteType: string;
}

export interface IncomeStatement {
  date: string;
  revenue: number;
  netIncome: number;
  eps: number;
  epsDiluted: number;
  grossProfit: number;
  operatingIncome: number;
  weightedAverageShsOutDil: number;
}

export interface KeyMetric {
  date: string;
  peRatio: number;
  priceToSalesRatio: number;
  pbRatio: number;
  debtToEquity: number;
  currentRatio: number;
  returnOnEquity: number;
  returnOnAssets: number;
  revenuePerShare: number;
  netIncomePerShare: number;
  freeCashFlowPerShare: number;
  dividendYield: number;
  enterpriseValueOverEBITDA: number;
}

export interface CashFlowStatement {
  date: string;
  freeCashFlow: number;
  operatingCashFlow: number;
  capitalExpenditure: number;
  dividendsPaid: number;
  netCashUsedForInvestingActivites: number;
  debtRepayment: number;
}

export interface BalanceSheetStatement {
  date: string;
  cashAndCashEquivalents: number;
  cashAndShortTermInvestments: number;
  totalDebt: number;
  netDebt: number;
  totalAssets: number;
  totalLiabilities: number;
  totalStockholdersEquity: number;
}

export interface DCFInputs {
  discountRate: number;       // % e.g. 10
  perpetualGrowthRate: number; // % e.g. 3
  fcfGrowthRate: number;       // % e.g. 15
  projectionYears: number;     // default 10
}

export interface DCFResult {
  projectedFCFs: number[];          // 10 years of projected FCF
  presentValues: number[];          // PV of each projected FCF
  totalPVofFCFs: number;            // sum of present values
  terminalValue: number;            // TV at year 10
  pvOfTerminalValue: number;        // PV of terminal value
  enterpriseValue: number;          // totalPV + pvOfTerminalValue
  equityValue: number;              // EV + cash - debt
  intrinsicValuePerShare: number;   // equityValue / shares
  marginOfSafety: number;           // % upside/downside from current price
}

export interface ProjectionYearInput {
  revGrowth: number;
  netMargin: number;
  peHigh: number;
  peLow: number;
}

export interface ProjectionRow {
  year: number;
  revenue: number;
  revGrowth: number;
  netIncome: number;
  netMargin: number;
  eps: number;
  peHigh: number;
  peLow: number;
  sharePriceHigh: number;
  sharePriceLow: number;
}

export type CaseType = "base" | "bull" | "bear";

export interface ProjectionCase {
  years: ProjectionYearInput[];
}

export interface ProjectionState {
  base: ProjectionCase;
  bull: ProjectionCase;
  bear: ProjectionCase;
  activeCase: CaseType;
}

export interface StockData {
  quote: StockQuote | null;
  incomeStatements: IncomeStatement[];
  keyMetrics: KeyMetric[];
  isLoading: boolean;
  error: string | null;
}

export interface NewsArticle {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
}

export interface MetricDefinition {
  key: string;
  label: string;
  description: string;
  format: "percent" | "ratio" | "currency" | "number";
  ranges: {
    excellent: [number, number];
    good: [number, number];
    fair: [number, number];
    poor: [number, number];
  };
  higherIsBetter: boolean;
}

export interface NotificationPrefs {
  emailAlerts: boolean;
  emailSummary: boolean;
  pushAlerts: boolean;
  signalAlerts: boolean;
  earningsAlerts: boolean;
  dividendAlerts: boolean;
  swingAlerts: boolean;
}

export type SignalType = "buy" | "sell" | "attention" | "swing";

export interface TechnicalSignal {
  ticker: string;
  signal: string;
  type: SignalType;
  value: number;
  description: string;
}

export interface CalendarEvent {
  ticker: string;
  event: "earnings" | "dividend";
  date: string;
  daysUntil: number;
  details?: string;
}
