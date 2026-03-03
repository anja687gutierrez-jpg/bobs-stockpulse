import type { TechnicalSignal, CalendarEvent, GapAlert, MarketMover } from "./types";

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
