"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { CashFlowStatement, BalanceSheetStatement, DCFInputs, DCFResult } from "@/lib/types";
import { computeDCF, deriveDCFInputs } from "@/lib/projections";

export function useDCF(
  cashFlowStatements: CashFlowStatement[],
  balanceSheetStatements: BalanceSheetStatement[],
  sharesOutstanding: number,
  currentPrice: number
) {
  const [baseFCF, setBaseFCF] = useState(0);
  const [cash, setCash] = useState(0);
  const [debt, setDebt] = useState(0);
  const [inputs, setInputs] = useState<DCFInputs>({
    discountRate: 10,
    perpetualGrowthRate: 3,
    fcfGrowthRate: 10,
    projectionYears: 10,
  });

  useEffect(() => {
    if (cashFlowStatements.length > 0 || balanceSheetStatements.length > 0) {
      const derived = deriveDCFInputs(cashFlowStatements, balanceSheetStatements);
      setBaseFCF(derived.baseFCF);
      setCash(derived.cash);
      setDebt(derived.debt);
      setInputs(derived.defaults);
    }
  }, [cashFlowStatements, balanceSheetStatements]);

  const updateInput = useCallback(
    (field: keyof DCFInputs, value: number) => {
      setInputs((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const result: DCFResult = useMemo(
    () => computeDCF(baseFCF, cash, debt, sharesOutstanding, currentPrice, inputs),
    [baseFCF, cash, debt, sharesOutstanding, currentPrice, inputs]
  );

  return {
    inputs,
    updateInput,
    result,
    baseFCF,
    cash,
    debt,
    hasData: cashFlowStatements.length > 0,
  };
}
