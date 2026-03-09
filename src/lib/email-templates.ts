import type { TechnicalSignal, CalendarEvent, GapAlert, MarketMover, TrendingStock } from "./types";

const APP_URL = "https://bobs-stockpulse.anja687gutierrez.workers.dev";

const emailFooter = `
  <div style="margin-top: 20px; padding: 16px; background: #2c2c2e; border-radius: 8px; text-align: center;">
    <p style="margin: 0 0 8px; color: #9ca3af; font-size: 13px;">Know someone who'd find this useful?</p>
    <a href="${APP_URL}" style="display: inline-block; padding: 8px 20px; background: #fbbf24; color: #000; font-weight: 600; font-size: 13px; text-decoration: none; border-radius: 6px;">Try StockPulse Free</a>
  </div>
  <hr style="border: none; border-top: 1px solid #374151; margin: 16px 0;" />
  <p style="margin: 0; color: #6b7280; font-size: 12px;">
    Bob's StockPulse — 1000X Stock Analysis
  </p>`;

export function alertTriggeredEmail(params: {
  ticker: string;
  currentPrice: number;
  targetPrice: number;
  direction: "above" | "below";
}): { subject: string; html: string } {
  const { ticker, currentPrice, targetPrice, direction } = params;
  return {
    subject: `StockPulse Alert: ${ticker} hit $${currentPrice.toFixed(2)}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #1c1c1e; color: #e5e5ea; border-radius: 12px;">
        <h2 style="color: #fbbf24; margin: 0 0 16px;">Price Alert Triggered</h2>
        <p style="margin: 0 0 8px; font-size: 16px;">
          <strong style="font-family: monospace; color: #fbbf24;">${ticker}</strong> is now
          <strong>$${currentPrice.toFixed(2)}</strong>
        </p>
        <p style="margin: 0 0 16px; color: #9ca3af; font-size: 14px;">
          Your target: $${targetPrice.toFixed(2)} (${direction})
        </p>
        ${emailFooter}
      </div>
    `,
  };
}

export function dailySummaryEmail(params: {
  portfolio: { ticker: string; name?: string; shares: number; price: number; change: number; value?: number }[];
  totalValue: number;
  totalChange: number;
}): { subject: string; html: string } {
  const { portfolio, totalValue, totalChange } = params;
  const changeColor = totalChange >= 0 ? "#34d399" : "#f87171";
  const changeSign = totalChange >= 0 ? "+" : "";

  const rows = portfolio
    .map(
      (h) => {
        const val = h.value ?? h.shares * h.price;
        return `<tr>
          <td style="padding: 4px 8px;"><span style="font-family: monospace; color: #fbbf24;">${h.ticker}</span>${h.name && h.name !== h.ticker ? `<br/><span style="color: #6b7280; font-size: 11px;">${h.name}</span>` : ""}</td>
          <td style="padding: 4px 8px; text-align: right;">${h.shares}</td>
          <td style="padding: 4px 8px; text-align: right;">$${h.price.toFixed(2)}</td>
          <td style="padding: 4px 8px; text-align: right;">$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 4px 8px; text-align: right; color: ${h.change >= 0 ? "#34d399" : "#f87171"};">${h.change >= 0 ? "+" : ""}${h.change.toFixed(2)}%</td>
        </tr>`;
      }
    )
    .join("");

  return {
    subject: `StockPulse Daily Summary — ${changeSign}${totalChange.toFixed(2)}%`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #1c1c1e; color: #e5e5ea; border-radius: 12px;">
        <h2 style="color: #fbbf24; margin: 0 0 4px;">Daily Portfolio Summary</h2>
        <p style="margin: 0 0 16px; color: #9ca3af; font-size: 14px;">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        <div style="background: #2c2c2e; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: bold;">$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span style="margin-left: 12px; color: ${changeColor}; font-size: 16px;">${changeSign}${totalChange.toFixed(2)}%</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
              <th style="padding: 4px 8px; text-align: left;">Ticker</th>
              <th style="padding: 4px 8px; text-align: right;">Shares</th>
              <th style="padding: 4px 8px; text-align: right;">Price</th>
              <th style="padding: 4px 8px; text-align: right;">Value</th>
              <th style="padding: 4px 8px; text-align: right;">Change</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${emailFooter}
      </div>
    `,
  };
}

const SIGNAL_COLORS: Record<string, string> = {
  buy: "#34d399",
  sell: "#f87171",
  attention: "#fbbf24",
  swing: "#a855f7",
};

export function technicalSignalEmail(params: {
  signals: TechnicalSignal[];
}): { subject: string; html: string } {
  const { signals } = params;
  const tickers = [...new Set(signals.map((s) => s.ticker))].join(", ");

  const rows = signals
    .map(
      (s) =>
        `<tr>
          <td style="padding: 6px 8px; font-family: monospace; color: #fbbf24;">${s.ticker}</td>
          <td style="padding: 6px 8px; color: ${SIGNAL_COLORS[s.type] ?? "#e5e5ea"}; font-weight: 600; text-transform: uppercase;">${s.type}</td>
          <td style="padding: 6px 8px;">${s.signal}</td>
          <td style="padding: 6px 8px; color: #9ca3af; font-size: 13px;">${s.description}</td>
        </tr>`
    )
    .join("");

  return {
    subject: `StockPulse Signals: ${tickers}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #1c1c1e; color: #e5e5ea; border-radius: 12px;">
        <h2 style="color: #fbbf24; margin: 0 0 16px;">Technical Signals Detected</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
              <th style="padding: 6px 8px; text-align: left;">Ticker</th>
              <th style="padding: 6px 8px; text-align: left;">Type</th>
              <th style="padding: 6px 8px; text-align: left;">Signal</th>
              <th style="padding: 6px 8px; text-align: left;">Details</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${emailFooter}
      </div>
    `,
  };
}

export function calendarEventEmail(params: {
  events: CalendarEvent[];
}): { subject: string; html: string } {
  const { events } = params;
  const rows = events
    .map(
      (e) =>
        `<tr>
          <td style="padding: 6px 8px; font-family: monospace; color: #fbbf24;">${e.ticker}</td>
          <td style="padding: 6px 8px; text-transform: capitalize;">${e.event}</td>
          <td style="padding: 6px 8px;">${e.date}</td>
          <td style="padding: 6px 8px; color: ${e.daysUntil <= 1 ? "#f87171" : "#fbbf24"}; font-weight: 600;">${e.daysUntil === 0 ? "Today" : e.daysUntil === 1 ? "Tomorrow" : `${e.daysUntil} days`}</td>
          <td style="padding: 6px 8px; color: #9ca3af; font-size: 13px;">${e.details ?? ""}</td>
        </tr>`
    )
    .join("");

  return {
    subject: `StockPulse: Upcoming ${events.length === 1 ? events[0].event : "Events"}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #1c1c1e; color: #e5e5ea; border-radius: 12px;">
        <h2 style="color: #fbbf24; margin: 0 0 16px;">Upcoming Calendar Events</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
              <th style="padding: 6px 8px; text-align: left;">Ticker</th>
              <th style="padding: 6px 8px; text-align: left;">Event</th>
              <th style="padding: 6px 8px; text-align: left;">Date</th>
              <th style="padding: 6px 8px; text-align: left;">When</th>
              <th style="padding: 6px 8px; text-align: left;">Details</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${emailFooter}
      </div>
    `,
  };
}

export function enhancedDailySummaryEmail(params: {
  portfolio: { ticker: string; name?: string; shares: number; price: number; change: number; value?: number }[];
  totalValue: number;
  totalChange: number;
  signals?: TechnicalSignal[];
  events?: CalendarEvent[];
}): { subject: string; html: string } {
  const { portfolio, totalValue, totalChange, signals, events } = params;
  const changeColor = totalChange >= 0 ? "#34d399" : "#f87171";
  const changeSign = totalChange >= 0 ? "+" : "";

  const holdingRows = portfolio
    .map(
      (h) => {
        const val = h.value ?? h.shares * h.price;
        return `<tr>
          <td style="padding: 4px 8px;"><span style="font-family: monospace; color: #fbbf24;">${h.ticker}</span>${h.name && h.name !== h.ticker ? `<br/><span style="color: #6b7280; font-size: 11px;">${h.name}</span>` : ""}</td>
          <td style="padding: 4px 8px; text-align: right;">${h.shares}</td>
          <td style="padding: 4px 8px; text-align: right;">$${h.price.toFixed(2)}</td>
          <td style="padding: 4px 8px; text-align: right;">$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 4px 8px; text-align: right; color: ${h.change >= 0 ? "#34d399" : "#f87171"};">${h.change >= 0 ? "+" : ""}${h.change.toFixed(2)}%</td>
        </tr>`;
      }
    )
    .join("");

  let signalsSection = "";
  if (signals && signals.length > 0) {
    const signalRows = signals
      .map(
        (s) =>
          `<tr>
            <td style="padding: 4px 8px; font-family: monospace; color: #fbbf24;">${s.ticker}</td>
            <td style="padding: 4px 8px; color: ${SIGNAL_COLORS[s.type] ?? "#e5e5ea"}; font-weight: 600; text-transform: uppercase;">${s.type}</td>
            <td style="padding: 4px 8px;">${s.signal}</td>
          </tr>`
      )
      .join("");
    signalsSection = `
      <h3 style="color: #fbbf24; margin: 16px 0 8px; font-size: 16px;">Technical Signals</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tbody>${signalRows}</tbody>
      </table>`;
  }

  let eventsSection = "";
  if (events && events.length > 0) {
    const eventRows = events
      .map(
        (e) =>
          `<tr>
            <td style="padding: 4px 8px; font-family: monospace; color: #fbbf24;">${e.ticker}</td>
            <td style="padding: 4px 8px; text-transform: capitalize;">${e.event}</td>
            <td style="padding: 4px 8px;">${e.date}</td>
            <td style="padding: 4px 8px; color: ${e.daysUntil <= 1 ? "#f87171" : "#fbbf24"};">${e.daysUntil === 0 ? "Today" : e.daysUntil === 1 ? "Tomorrow" : `${e.daysUntil}d`}</td>
          </tr>`
      )
      .join("");
    eventsSection = `
      <h3 style="color: #fbbf24; margin: 16px 0 8px; font-size: 16px;">Upcoming Events</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tbody>${eventRows}</tbody>
      </table>`;
  }

  return {
    subject: `StockPulse Daily Summary — ${changeSign}${totalChange.toFixed(2)}%`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #1c1c1e; color: #e5e5ea; border-radius: 12px;">
        <h2 style="color: #fbbf24; margin: 0 0 4px;">Daily Portfolio Summary</h2>
        <p style="margin: 0 0 16px; color: #9ca3af; font-size: 14px;">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        <div style="background: #2c2c2e; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: bold;">$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span style="margin-left: 12px; color: ${changeColor}; font-size: 16px;">${changeSign}${totalChange.toFixed(2)}%</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
              <th style="padding: 4px 8px; text-align: left;">Ticker</th>
              <th style="padding: 4px 8px; text-align: right;">Shares</th>
              <th style="padding: 4px 8px; text-align: right;">Price</th>
              <th style="padding: 4px 8px; text-align: right;">Value</th>
              <th style="padding: 4px 8px; text-align: right;">Change</th>
            </tr>
          </thead>
          <tbody>${holdingRows}</tbody>
        </table>
        ${signalsSection}
        ${eventsSection}
        ${emailFooter}
      </div>
    `,
  };
}

const SIGNAL_ORDER: Record<string, number> = { buy: 0, sell: 1, attention: 2, swing: 3 };

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return vol.toLocaleString();
}

function moverRows(movers: MarketMover[], color: string): string {
  return movers
    .map(
      (m) =>
        `<tr>
          <td style="padding: 6px 8px; font-family: monospace; color: #fbbf24;">${m.ticker}</td>
          <td style="padding: 6px 8px; color: #9ca3af; font-size: 12px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.name}</td>
          <td style="padding: 6px 8px; text-align: right;">$${m.price.toFixed(2)}</td>
          <td style="padding: 6px 8px; text-align: right; color: ${color}; font-weight: 600;">${m.changePercent >= 0 ? "+" : ""}${m.changePercent.toFixed(2)}%</td>
          <td style="padding: 6px 8px; text-align: right; color: #9ca3af;">${formatVolume(m.volume)}</td>
        </tr>`
    )
    .join("");
}

// --- SVG Chart Generators ---

const CHART_COLORS = [
  "#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa",
  "#fb923c", "#2dd4bf", "#818cf8", "#e879f9", "#38bdf8",
];

type HoldingData = { ticker: string; name: string; shares: number; price: number; changePercent: number; value: number };

function buildAllocationChart(holdings: HoldingData[], totalValue: number): string {
  if (holdings.length === 0 || totalValue === 0) return "";
  const top = [...holdings].sort((a, b) => b.value - a.value).slice(0, 8);
  const topTotal = top.reduce((s, h) => s + h.value, 0);
  const otherValue = totalValue - topTotal;
  const barWidth = 480;
  const rowHeight = 28;
  const labelWidth = 60;
  const valueWidth = 80;
  const barAreaWidth = barWidth - labelWidth - valueWidth - 16;
  const maxValue = top[0]?.value ?? 1;
  const items = otherValue > 0 ? [...top, { ticker: "Other", value: otherValue }] : top;
  const svgHeight = items.length * rowHeight + 8;

  const bars = items.map((h, i) => {
    const pct = (h.value / totalValue) * 100;
    const w = Math.max(2, (h.value / maxValue) * barAreaWidth);
    const y = i * rowHeight + 4;
    const color = i < CHART_COLORS.length ? CHART_COLORS[i] : "#6b7280";
    return `
      <text x="0" y="${y + 17}" fill="${color}" font-size="12" font-family="monospace" font-weight="600">${h.ticker.slice(0, 6)}</text>
      <rect x="${labelWidth}" y="${y + 4}" width="${w}" height="18" rx="3" fill="${color}" opacity="0.85"/>
      <text x="${labelWidth + barAreaWidth + 8}" y="${y + 17}" fill="#9ca3af" font-size="11" font-family="sans-serif" text-anchor="end">${pct.toFixed(1)}%</text>`;
  }).join("");

  return `
    <div style="background: #2c2c2e; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 12px; color: #fbbf24; font-size: 14px; font-weight: 600;">Portfolio Allocation</p>
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${barWidth} ${svgHeight}" style="max-width: ${barWidth}px;">
        ${bars}
      </svg>
    </div>`;
}

function buildMoversChart(movers: HoldingData[]): string {
  if (movers.length === 0) return "";
  const barWidth = 480;
  const rowHeight = 30;
  const labelWidth = 60;
  const pctLabelWidth = 56;
  const centerX = labelWidth + (barWidth - labelWidth - pctLabelWidth) / 2;
  const halfBar = (barWidth - labelWidth - pctLabelWidth) / 2;
  const maxPct = Math.max(...movers.map((m) => Math.abs(m.changePercent)), 1);
  const svgHeight = movers.length * rowHeight + 8;

  // Center line
  let svg = `<line x1="${centerX}" y1="0" x2="${centerX}" y2="${svgHeight}" stroke="#374151" stroke-width="1" stroke-dasharray="4,3"/>`;

  svg += movers.map((h, i) => {
    const y = i * rowHeight + 4;
    const pct = h.changePercent;
    const barLen = Math.max(2, (Math.abs(pct) / maxPct) * halfBar * 0.9);
    const color = pct >= 0 ? "#34d399" : "#f87171";
    const barX = pct >= 0 ? centerX : centerX - barLen;
    const sign = pct >= 0 ? "+" : "";
    return `
      <text x="0" y="${y + 18}" fill="#fbbf24" font-size="12" font-family="monospace" font-weight="600">${h.ticker.slice(0, 6)}</text>
      <rect x="${barX}" y="${y + 5}" width="${barLen}" height="16" rx="3" fill="${color}" opacity="0.85"/>
      <text x="${barWidth - 4}" y="${y + 18}" fill="${color}" font-size="11" font-family="sans-serif" font-weight="600" text-anchor="end">${sign}${pct.toFixed(1)}%</text>`;
  }).join("");

  return `
    <div style="background: #2c2c2e; border-radius: 8px; padding: 16px; margin-bottom: 4px;">
      <p style="margin: 0 0 12px; color: #fbbf24; font-size: 14px; font-weight: 600;">Today's Portfolio Movers</p>
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${barWidth} ${svgHeight}" style="max-width: ${barWidth}px;">
        ${svg}
      </svg>
    </div>`;
}

function buildSentimentBar(gainerCount: number, loserCount: number): string {
  const total = gainerCount + loserCount;
  if (total === 0) return "";
  const gainerPct = (gainerCount / total) * 100;
  const loserPct = (loserCount / total) * 100;
  const barWidth = 480;
  const gainerW = Math.round((gainerPct / 100) * barWidth);
  const loserW = barWidth - gainerW;

  return `
    <div style="background: #2c2c2e; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 10px; color: #fbbf24; font-size: 14px; font-weight: 600;">Market Sentiment</p>
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${barWidth} 40" style="max-width: ${barWidth}px;">
        <rect x="0" y="0" width="${gainerW}" height="24" rx="${loserW === 0 ? 6 : 0}" fill="#34d399" opacity="0.85"/>
        <rect x="${gainerW}" y="0" width="${loserW}" height="24" rx="${gainerW === 0 ? 6 : 0}" fill="#f87171" opacity="0.85"/>
        ${gainerW > 0 ? `<rect x="0" y="0" width="${Math.min(gainerW, 6)}" height="24" rx="6" fill="#34d399" opacity="0.85"/>` : ""}
        ${loserW > 0 ? `<rect x="${barWidth - Math.min(loserW, 6)}" y="0" width="${Math.min(loserW, 6)}" height="24" rx="6" fill="#f87171" opacity="0.85"/>` : ""}
        ${gainerPct > 8 ? `<text x="${gainerW / 2}" y="16" fill="#000" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="middle">${gainerCount} up</text>` : ""}
        ${loserPct > 8 ? `<text x="${gainerW + loserW / 2}" y="16" fill="#000" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="middle">${loserCount} down</text>` : ""}
        <text x="0" y="38" fill="#34d399" font-size="11" font-family="sans-serif">${gainerPct.toFixed(0)}% gaining</text>
        <text x="${barWidth}" y="38" fill="#f87171" font-size="11" font-family="sans-serif" text-anchor="end">${loserPct.toFixed(0)}% losing</text>
      </svg>
    </div>`;
}

export function dailyMarketEmail(params: {
  holdings: HoldingData[];
  significantMovers: HoldingData[];
  totalValue: number;
  totalChange: number;
  signals: TechnicalSignal[];
  events: CalendarEvent[];
  gainers: MarketMover[];
  losers: MarketMover[];
  trending: TrendingStock[];
}): { subject: string; html: string } {
  const { holdings, significantMovers, totalValue, totalChange, signals, events, gainers, losers, trending } = params;
  const changeColor = totalChange >= 0 ? "#34d399" : "#f87171";
  const changeSign = totalChange >= 0 ? "+" : "";
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const sortedSignals = [...signals].sort(
    (a, b) => (SIGNAL_ORDER[a.type] ?? 9) - (SIGNAL_ORDER[b.type] ?? 9)
  );

  // --- Subject line ---
  const subjectParts: string[] = [];
  if (significantMovers.length > 0) {
    subjectParts.push(`${significantMovers.length} portfolio mover${significantMovers.length !== 1 ? "s" : ""}`);
  }
  if (sortedSignals.length > 0) {
    subjectParts.push(`${sortedSignals.length} signal${sortedSignals.length !== 1 ? "s" : ""}`);
  }
  const subject = subjectParts.length > 0
    ? `StockPulse Daily — ${subjectParts.join(", ")}`
    : "StockPulse Daily — markets steady";

  // --- Portfolio summary card ---
  const summaryCard = `
    <div style="background: #2c2c2e; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;">
      <span style="font-size: 24px; font-weight: bold;">$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      <span style="margin-left: 12px; color: ${changeColor}; font-size: 16px;">${changeSign}${totalChange.toFixed(2)}%</span>
    </div>`;

  // --- SVG: Portfolio allocation chart ---
  const allocationChart = buildAllocationChart(holdings, totalValue);

  // --- SVG: Movers diverging bar chart ---
  const moversChart = buildMoversChart(significantMovers);

  // --- Portfolio Movers table (only ≥2% moves) ---
  let moversSection: string;
  if (significantMovers.length > 0) {
    const moverRowsHtml = significantMovers
      .map(
        (h) =>
          `<tr>
            <td style="padding: 4px 8px;"><span style="font-family: monospace; color: #fbbf24;">${h.ticker}</span>${h.name !== h.ticker ? `<br/><span style="color: #6b7280; font-size: 11px;">${h.name}</span>` : ""}</td>
            <td style="padding: 4px 8px; text-align: right;">${h.shares}</td>
            <td style="padding: 4px 8px; text-align: right;">$${h.price.toFixed(2)}</td>
            <td style="padding: 4px 8px; text-align: right;">$${h.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 4px 8px; text-align: right; color: ${h.changePercent >= 0 ? "#34d399" : "#f87171"}; font-weight: 600;">${h.changePercent >= 0 ? "+" : ""}${h.changePercent.toFixed(2)}%</td>
          </tr>`
      )
      .join("");
    moversSection = `
      ${moversChart}
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
            <th style="padding: 4px 8px; text-align: left;">Ticker</th>
            <th style="padding: 4px 8px; text-align: right;">Shares</th>
            <th style="padding: 4px 8px; text-align: right;">Price</th>
            <th style="padding: 4px 8px; text-align: right;">Value</th>
            <th style="padding: 4px 8px; text-align: right;">Change</th>
          </tr>
        </thead>
        <tbody>${moverRowsHtml}</tbody>
      </table>
      <p style="margin: 4px 0 16px; color: #6b7280; font-size: 12px;">${significantMovers.length} of ${holdings.length} holdings moved significantly</p>`;
  } else {
    moversSection = `
      <div style="background: #2c2c2e; padding: 16px; border-radius: 8px; margin-bottom: 16px; text-align: center;">
        <p style="margin: 0; color: #9ca3af; font-size: 14px;">No portfolio holdings moved more than 2% today</p>
      </div>`;
  }

  // --- Technical Signals ---
  let signalsSection = "";
  if (sortedSignals.length > 0) {
    const signalRows = sortedSignals
      .map(
        (s) =>
          `<tr>
            <td style="padding: 6px 8px; font-family: monospace; color: #fbbf24;">${s.ticker}</td>
            <td style="padding: 6px 8px;"><span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${SIGNAL_COLORS[s.type] ?? "#374151"}22; color: ${SIGNAL_COLORS[s.type] ?? "#e5e5ea"}; font-weight: 600; font-size: 12px; text-transform: uppercase;">${s.type}</span></td>
            <td style="padding: 6px 8px; font-size: 13px;">${s.signal}</td>
            <td style="padding: 6px 8px; color: #9ca3af; font-size: 12px;">${s.description}</td>
          </tr>`
      )
      .join("");
    signalsSection = `
      <h3 style="color: #fbbf24; margin: 20px 0 8px; font-size: 16px;">Technical Signals (${sortedSignals.length})</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
            <th style="padding: 6px 8px; text-align: left;">Ticker</th>
            <th style="padding: 6px 8px; text-align: left;">Type</th>
            <th style="padding: 6px 8px; text-align: left;">Signal</th>
            <th style="padding: 6px 8px; text-align: left;">Details</th>
          </tr>
        </thead>
        <tbody>${signalRows}</tbody>
      </table>`;
  }

  // --- SVG: Market sentiment bar ---
  const sentimentBar = buildSentimentBar(gainers.length, losers.length);

  // --- Market Movers ---
  let marketMoversSection = "";
  if (gainers.length > 0 || losers.length > 0) {
    const gainersHtml = gainers.length > 0
      ? `<h3 style="color: #34d399; margin: 12px 0 8px; font-size: 16px;">Top Gainers (${gainers.length})</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 12px;">
          <thead>
            <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
              <th style="padding: 6px 8px; text-align: left;">Ticker</th>
              <th style="padding: 6px 8px; text-align: left;">Name</th>
              <th style="padding: 6px 8px; text-align: right;">Price</th>
              <th style="padding: 6px 8px; text-align: right;">Change</th>
              <th style="padding: 6px 8px; text-align: right;">Volume</th>
            </tr>
          </thead>
          <tbody>${moverRows(gainers, "#34d399")}</tbody>
        </table>`
      : "";

    const losersHtml = losers.length > 0
      ? `<h3 style="color: #f87171; margin: 12px 0 8px; font-size: 16px;">Top Losers (${losers.length})</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
              <th style="padding: 6px 8px; text-align: left;">Ticker</th>
              <th style="padding: 6px 8px; text-align: left;">Name</th>
              <th style="padding: 6px 8px; text-align: right;">Price</th>
              <th style="padding: 6px 8px; text-align: right;">Change</th>
              <th style="padding: 6px 8px; text-align: right;">Volume</th>
            </tr>
          </thead>
          <tbody>${moverRows(losers, "#f87171")}</tbody>
        </table>`
      : "";

    marketMoversSection = `
      <hr style="border: none; border-top: 1px solid #374151; margin: 20px 0;" />
      <h2 style="color: #fbbf24; margin: 0 0 12px; font-size: 18px;">Market Movers</h2>
      ${sentimentBar}
      <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px;">Excludes your portfolio holdings</p>
      ${gainersHtml}
      ${losersHtml}`;
  }

  // --- Trending ---
  let trendingSection = "";
  if (trending.length > 0) {
    const trendingRows = trending
      .map(
        (t) =>
          `<tr>
            <td style="padding: 6px 8px; font-family: monospace; color: #fbbf24;">${t.ticker}</td>
            <td style="padding: 6px 8px; color: #9ca3af; font-size: 12px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.name}</td>
            <td style="padding: 6px 8px; text-align: right;">$${t.price.toFixed(2)}</td>
            <td style="padding: 6px 8px; text-align: right; color: ${t.changePercent >= 0 ? "#34d399" : "#f87171"}; font-weight: 600;">${t.changePercent >= 0 ? "+" : ""}${t.changePercent.toFixed(2)}%</td>
            <td style="padding: 6px 8px; text-align: right; color: #9ca3af;">${formatVolume(t.volume)}</td>
          </tr>`
      )
      .join("");
    trendingSection = `
      <hr style="border: none; border-top: 1px solid #374151; margin: 20px 0;" />
      <h2 style="color: #fbbf24; margin: 0 0 8px; font-size: 18px;">What the Market is Watching</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
            <th style="padding: 6px 8px; text-align: left;">Ticker</th>
            <th style="padding: 6px 8px; text-align: left;">Name</th>
            <th style="padding: 6px 8px; text-align: right;">Price</th>
            <th style="padding: 6px 8px; text-align: right;">Change</th>
            <th style="padding: 6px 8px; text-align: right;">Volume</th>
          </tr>
        </thead>
        <tbody>${trendingRows}</tbody>
      </table>`;
  }

  // --- Events ---
  let eventsSection = "";
  if (events.length > 0) {
    const eventRows = events
      .map(
        (e) =>
          `<tr>
            <td style="padding: 4px 8px; font-family: monospace; color: #fbbf24;">${e.ticker}</td>
            <td style="padding: 4px 8px; text-transform: capitalize;">${e.event}</td>
            <td style="padding: 4px 8px;">${e.date}</td>
            <td style="padding: 4px 8px; color: ${e.daysUntil <= 1 ? "#f87171" : "#fbbf24"};">${e.daysUntil === 0 ? "Today" : e.daysUntil === 1 ? "Tomorrow" : `${e.daysUntil}d`}</td>
          </tr>`
      )
      .join("");
    eventsSection = `
      <h3 style="color: #fbbf24; margin: 20px 0 8px; font-size: 16px;">Upcoming Events</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tbody>${eventRows}</tbody>
      </table>`;
  }

  return {
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #1c1c1e; color: #e5e5ea; border-radius: 12px;">
        <h2 style="color: #fbbf24; margin: 0 0 4px;">Daily Market Report</h2>
        <p style="margin: 0 0 16px; color: #9ca3af; font-size: 14px;">${dateStr}</p>
        ${summaryCard}
        ${allocationChart}
        ${moversSection}
        ${signalsSection}
        ${marketMoversSection}
        ${trendingSection}
        ${eventsSection}
        ${emailFooter}
      </div>
    `,
  };
}

export function eveningScanEmail(params: {
  holdings: { ticker: string; name: string; shares: number; price: number; change: number; value: number; scanned: boolean }[];
  totalValue: number;
  totalChange: number;
  signals: TechnicalSignal[];
  events: CalendarEvent[];
  scannedCount: number;
  totalCount: number;
}): { subject: string; html: string } {
  const { holdings, totalValue, totalChange, signals, events, scannedCount, totalCount } = params;
  const changeColor = totalChange >= 0 ? "#34d399" : "#f87171";
  const changeSign = totalChange >= 0 ? "+" : "";

  const sortedSignals = [...signals].sort(
    (a, b) => (SIGNAL_ORDER[a.type] ?? 9) - (SIGNAL_ORDER[b.type] ?? 9)
  );

  let signalsSection = "";
  if (sortedSignals.length > 0) {
    const signalRows = sortedSignals
      .map(
        (s) =>
          `<tr>
            <td style="padding: 6px 8px; font-family: monospace; color: #fbbf24;">${s.ticker}</td>
            <td style="padding: 6px 8px;"><span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${SIGNAL_COLORS[s.type] ?? "#374151"}22; color: ${SIGNAL_COLORS[s.type] ?? "#e5e5ea"}; font-weight: 600; font-size: 12px; text-transform: uppercase;">${s.type}</span></td>
            <td style="padding: 6px 8px; font-size: 13px;">${s.signal}</td>
            <td style="padding: 6px 8px; color: #9ca3af; font-size: 12px;">${s.description}</td>
          </tr>`
      )
      .join("");
    signalsSection = `
      <h3 style="color: #fbbf24; margin: 20px 0 8px; font-size: 16px;">Technical Signals (${sortedSignals.length})</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
            <th style="padding: 6px 8px; text-align: left;">Ticker</th>
            <th style="padding: 6px 8px; text-align: left;">Type</th>
            <th style="padding: 6px 8px; text-align: left;">Signal</th>
            <th style="padding: 6px 8px; text-align: left;">Details</th>
          </tr>
        </thead>
        <tbody>${signalRows}</tbody>
      </table>`;
  }

  const holdingRows = holdings
    .map((h) => {
      if (!h.scanned) {
        return `<tr style="color: #6b7280;">
          <td style="padding: 4px 8px; font-family: monospace;">${h.ticker}</td>
          <td style="padding: 4px 8px; text-align: right;">${h.shares}</td>
          <td style="padding: 4px 8px; text-align: right;">&mdash;</td>
          <td style="padding: 4px 8px; text-align: right;">&mdash;</td>
          <td style="padding: 4px 8px; text-align: right;">&mdash;</td>
        </tr>`;
      }
      return `<tr>
        <td style="padding: 4px 8px;"><span style="font-family: monospace; color: #fbbf24;">${h.ticker}</span>${h.name !== h.ticker ? `<br/><span style="color: #6b7280; font-size: 11px;">${h.name}</span>` : ""}</td>
        <td style="padding: 4px 8px; text-align: right;">${h.shares}</td>
        <td style="padding: 4px 8px; text-align: right;">$${h.price.toFixed(2)}</td>
        <td style="padding: 4px 8px; text-align: right;">$${h.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 4px 8px; text-align: right; color: ${h.change >= 0 ? "#34d399" : "#f87171"};">${h.change >= 0 ? "+" : ""}${h.change.toFixed(2)}%</td>
      </tr>`;
    })
    .join("");

  let eventsSection = "";
  if (events.length > 0) {
    const eventRows = events
      .map(
        (e) =>
          `<tr>
            <td style="padding: 4px 8px; font-family: monospace; color: #fbbf24;">${e.ticker}</td>
            <td style="padding: 4px 8px; text-transform: capitalize;">${e.event}</td>
            <td style="padding: 4px 8px;">${e.date}</td>
            <td style="padding: 4px 8px; color: ${e.daysUntil <= 1 ? "#f87171" : "#fbbf24"};">${e.daysUntil === 0 ? "Today" : e.daysUntil === 1 ? "Tomorrow" : `${e.daysUntil}d`}</td>
          </tr>`
      )
      .join("");
    eventsSection = `
      <h3 style="color: #fbbf24; margin: 20px 0 8px; font-size: 16px;">Upcoming Events</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tbody>${eventRows}</tbody>
      </table>`;
  }

  return {
    subject: `StockPulse Evening Scan — ${sortedSignals.length} signal${sortedSignals.length !== 1 ? "s" : ""} detected`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #1c1c1e; color: #e5e5ea; border-radius: 12px;">
        <h2 style="color: #fbbf24; margin: 0 0 4px;">Evening Market Scan</h2>
        <p style="margin: 0 0 16px; color: #9ca3af; font-size: 14px;">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        <div style="background: #2c2c2e; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: bold;">$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span style="margin-left: 12px; color: ${changeColor}; font-size: 16px;">${changeSign}${totalChange.toFixed(2)}%</span>
        </div>
        ${signalsSection}
        <h3 style="color: #fbbf24; margin: 20px 0 8px; font-size: 16px;">Holdings</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
              <th style="padding: 4px 8px; text-align: left;">Ticker</th>
              <th style="padding: 4px 8px; text-align: right;">Shares</th>
              <th style="padding: 4px 8px; text-align: right;">Price</th>
              <th style="padding: 4px 8px; text-align: right;">Value</th>
              <th style="padding: 4px 8px; text-align: right;">Change</th>
            </tr>
          </thead>
          <tbody>${holdingRows}</tbody>
        </table>
        ${eventsSection}
        <p style="margin: 16px 0 0; color: #6b7280; font-size: 12px; text-align: center;">Scanned ${scannedCount} of ${totalCount} holdings</p>
        ${emailFooter}
      </div>
    `,
  };
}

export function morningBriefEmail(params: {
  gaps: GapAlert[];
  holdings: { ticker: string; name: string; shares: number; price: number; change: number }[];
  quotedCount: number;
  totalCount: number;
}): { subject: string; html: string } {
  const { gaps, holdings, quotedCount, totalCount } = params;

  let gapSection: string;
  if (gaps.length > 0) {
    const sortedGaps = [...gaps].sort((a, b) => Math.abs(b.gapPercent) - Math.abs(a.gapPercent));
    const gapRows = sortedGaps
      .map(
        (g) =>
          `<tr>
            <td style="padding: 6px 8px; font-family: monospace; color: #fbbf24;">${g.ticker}</td>
            <td style="padding: 6px 8px; color: #9ca3af; font-size: 12px;">${g.name}</td>
            <td style="padding: 6px 8px; text-align: right;">$${g.previousClose.toFixed(2)}</td>
            <td style="padding: 6px 8px; text-align: right;">$${g.currentPrice.toFixed(2)}</td>
            <td style="padding: 6px 8px; text-align: right; font-weight: 600; color: ${g.direction === "up" ? "#34d399" : "#f87171"};">${g.direction === "up" ? "+" : ""}${g.gapPercent.toFixed(2)}%</td>
          </tr>`
      )
      .join("");
    gapSection = `
      <h3 style="color: #f87171; margin: 0 0 8px; font-size: 16px;">Gap Alerts (${gaps.length})</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
            <th style="padding: 6px 8px; text-align: left;">Ticker</th>
            <th style="padding: 6px 8px; text-align: left;">Name</th>
            <th style="padding: 6px 8px; text-align: right;">Prev Close</th>
            <th style="padding: 6px 8px; text-align: right;">Current</th>
            <th style="padding: 6px 8px; text-align: right;">Gap</th>
          </tr>
        </thead>
        <tbody>${gapRows}</tbody>
      </table>`;
  } else {
    gapSection = `
      <div style="background: #2c2c2e; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #9ca3af; font-size: 14px;">No significant overnight gaps — markets steady</p>
      </div>`;
  }

  const holdingRows = holdings
    .map(
      (h) =>
        `<tr>
          <td style="padding: 4px 8px;"><span style="font-family: monospace; color: #fbbf24;">${h.ticker}</span>${h.name !== h.ticker ? `<br/><span style="color: #6b7280; font-size: 11px;">${h.name}</span>` : ""}</td>
          <td style="padding: 4px 8px; text-align: right;">${h.shares}</td>
          <td style="padding: 4px 8px; text-align: right;">$${h.price.toFixed(2)}</td>
          <td style="padding: 4px 8px; text-align: right; color: ${h.change >= 0 ? "#34d399" : "#f87171"};">${h.change >= 0 ? "+" : ""}${h.change.toFixed(2)}%</td>
        </tr>`
    )
    .join("");

  return {
    subject: `StockPulse Morning Brief — ${gaps.length} overnight mover${gaps.length !== 1 ? "s" : ""}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #1c1c1e; color: #e5e5ea; border-radius: 12px;">
        <h2 style="color: #fbbf24; margin: 0 0 4px;">Morning Market Brief</h2>
        <p style="margin: 0 0 16px; color: #9ca3af; font-size: 14px;">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        ${gapSection}
        <h3 style="color: #fbbf24; margin: 20px 0 8px; font-size: 16px;">Portfolio Snapshot</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
              <th style="padding: 4px 8px; text-align: left;">Ticker</th>
              <th style="padding: 4px 8px; text-align: right;">Shares</th>
              <th style="padding: 4px 8px; text-align: right;">Price</th>
              <th style="padding: 4px 8px; text-align: right;">Change</th>
            </tr>
          </thead>
          <tbody>${holdingRows}</tbody>
        </table>
        <p style="margin: 16px 0 0; color: #6b7280; font-size: 12px; text-align: center;">Quoted ${quotedCount} of ${totalCount} holdings</p>
        ${emailFooter}
      </div>
    `,
  };
}

export function marketMoversEmail(params: {
  gainers: MarketMover[];
  losers: MarketMover[];
}): { subject: string; html: string } {
  const { gainers, losers } = params;

  function formatVolume(vol: number): string {
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
    return vol.toLocaleString();
  }

  function moverRows(movers: MarketMover[], color: string): string {
    return movers
      .map(
        (m) =>
          `<tr>
            <td style="padding: 6px 8px; font-family: monospace; color: #fbbf24;">${m.ticker}</td>
            <td style="padding: 6px 8px; color: #9ca3af; font-size: 12px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.name}</td>
            <td style="padding: 6px 8px; text-align: right;">$${m.price.toFixed(2)}</td>
            <td style="padding: 6px 8px; text-align: right; color: ${color}; font-weight: 600;">${m.changePercent >= 0 ? "+" : ""}${m.changePercent.toFixed(2)}%</td>
            <td style="padding: 6px 8px; text-align: right; color: #9ca3af;">${formatVolume(m.volume)}</td>
          </tr>`
      )
      .join("");
  }

  const gainersSection = gainers.length > 0
    ? `<h3 style="color: #34d399; margin: 0 0 8px; font-size: 16px;">Top Gainers (${gainers.length})</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
        <thead>
          <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
            <th style="padding: 6px 8px; text-align: left;">Ticker</th>
            <th style="padding: 6px 8px; text-align: left;">Name</th>
            <th style="padding: 6px 8px; text-align: right;">Price</th>
            <th style="padding: 6px 8px; text-align: right;">Change</th>
            <th style="padding: 6px 8px; text-align: right;">Volume</th>
          </tr>
        </thead>
        <tbody>${moverRows(gainers, "#34d399")}</tbody>
      </table>`
    : "";

  const losersSection = losers.length > 0
    ? `<h3 style="color: #f87171; margin: 0 0 8px; font-size: 16px;">Top Losers (${losers.length})</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="color: #6b7280; border-bottom: 1px solid #374151;">
            <th style="padding: 6px 8px; text-align: left;">Ticker</th>
            <th style="padding: 6px 8px; text-align: left;">Name</th>
            <th style="padding: 6px 8px; text-align: right;">Price</th>
            <th style="padding: 6px 8px; text-align: right;">Change</th>
            <th style="padding: 6px 8px; text-align: right;">Volume</th>
          </tr>
        </thead>
        <tbody>${moverRows(losers, "#f87171")}</tbody>
      </table>`
    : "";

  return {
    subject: `StockPulse Market Movers — ${gainers.length} gainers, ${losers.length} losers`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #1c1c1e; color: #e5e5ea; border-radius: 12px;">
        <h2 style="color: #fbbf24; margin: 0 0 4px;">Market Movers</h2>
        <p style="margin: 0 0 16px; color: #9ca3af; font-size: 14px;">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        ${gainersSection}
        ${losersSection}
        <p style="margin: 16px 0 0; color: #6b7280; font-size: 12px; text-align: center;">Excludes your portfolio holdings</p>
        ${emailFooter}
      </div>
    `,
  };
}
