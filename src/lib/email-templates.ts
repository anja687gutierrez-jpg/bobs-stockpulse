import type { TechnicalSignal, CalendarEvent } from "./types";

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
        <hr style="border: none; border-top: 1px solid #374151; margin: 16px 0;" />
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          Bob's StockPulse — 1000X Stock Analysis
        </p>
      </div>
    `,
  };
}

export function dailySummaryEmail(params: {
  portfolio: { ticker: string; shares: number; price: number; change: number; value?: number }[];
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
          <td style="padding: 4px 8px; font-family: monospace; color: #fbbf24;">${h.ticker}</td>
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
        <hr style="border: none; border-top: 1px solid #374151; margin: 16px 0;" />
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          Bob's StockPulse — 1000X Stock Analysis
        </p>
      </div>
    `,
  };
}

const SIGNAL_COLORS: Record<string, string> = {
  buy: "#34d399",
  sell: "#f87171",
  attention: "#fbbf24",
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
        <hr style="border: none; border-top: 1px solid #374151; margin: 16px 0;" />
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          Bob's StockPulse — 1000X Stock Analysis
        </p>
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
        <hr style="border: none; border-top: 1px solid #374151; margin: 16px 0;" />
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          Bob's StockPulse — 1000X Stock Analysis
        </p>
      </div>
    `,
  };
}

export function enhancedDailySummaryEmail(params: {
  portfolio: { ticker: string; shares: number; price: number; change: number; value?: number }[];
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
          <td style="padding: 4px 8px; font-family: monospace; color: #fbbf24;">${h.ticker}</td>
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
        <hr style="border: none; border-top: 1px solid #374151; margin: 16px 0;" />
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          Bob's StockPulse — 1000X Stock Analysis
        </p>
      </div>
    `,
  };
}
