"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { CaseType, ProjectionCase, ProjectionYearInput, ProjectionRow, IncomeStatement, KeyMetric } from "@/lib/types";
import { computeProjections, computeCAGR, deriveProjectionCases } from "@/lib/projections";

export function useProjections(
  incomeStatements: IncomeStatement[],
  keyMetrics: KeyMetric[],
  baseRevenue: number,
  sharesOutstanding: number,
  currentPrice: number
) {
  const [cases, setCases] = useState<Record<CaseType, ProjectionCase>>({
    base: { years: defaultYears() },
    bull: { years: defaultYears() },
    bear: { years: defaultYears() },
  });
  const [activeCase, setActiveCase] = useState<CaseType>("base");

  // When income statements load, derive cases from historical data
  useEffect(() => {
    if (incomeStatements.length > 0) {
      const derived = deriveProjectionCases(incomeStatements, keyMetrics);
      setCases(derived);
    }
  }, [incomeStatements, keyMetrics]);

  const updateYear = useCallback(
    (yearIndex: number, field: keyof ProjectionYearInput, value: number) => {
      setCases((prev) => {
        const updated = { ...prev };
        const caseData = { ...updated[activeCase] };
        const years = [...caseData.years];
        years[yearIndex] = { ...years[yearIndex], [field]: value };
        caseData.years = years;
        updated[activeCase] = caseData;
        return updated;
      });
    },
    [activeCase]
  );

  const rows: ProjectionRow[] = useMemo(
    () => computeProjections(cases[activeCase].years, baseRevenue, sharesOutstanding),
    [cases, activeCase, baseRevenue, sharesOutstanding]
  );

  const cagrHigh = useMemo(() => {
    const lastRow = rows[rows.length - 1];
    return lastRow ? computeCAGR(currentPrice, lastRow.sharePriceHigh, rows.length) : 0;
  }, [rows, currentPrice]);

  const cagrLow = useMemo(() => {
    const lastRow = rows[rows.length - 1];
    return lastRow ? computeCAGR(currentPrice, lastRow.sharePriceLow, rows.length) : 0;
  }, [rows, currentPrice]);

  return {
    activeCase,
    setActiveCase,
    inputs: cases[activeCase].years,
    updateYear,
    rows,
    cagrHigh,
    cagrLow,
  };
}

function defaultYears(): ProjectionYearInput[] {
  return Array.from({ length: 5 }, () => ({
    revGrowth: 10,
    netMargin: 10,
    peHigh: 20,
    peLow: 12,
  }));
}
