"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { ProjectionYearInput, ProjectionRow } from "@/lib/types";
import { formatCurrency, formatLargeNumber } from "@/lib/utils";

interface ProjectionTableProps {
  inputs: ProjectionYearInput[];
  rows: ProjectionRow[];
  cagrHigh: number;
  cagrLow: number;
  currentPrice: number;
  onInputChange: (yearIndex: number, field: keyof ProjectionYearInput, value: number) => void;
}

function EditableCell({
  value,
  onChange,
  suffix = "",
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <Input
        type="number"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-20 h-7 text-xs text-center bg-amber-400/5 border-amber-400/20 text-amber-400 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

export function ProjectionTable({
  inputs,
  rows,
  cagrHigh,
  cagrLow,
  currentPrice,
  onInputChange,
}: ProjectionTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-muted-foreground">Metric</TableHead>
            {rows.map((r) => (
              <TableHead key={r.year} className="text-center text-muted-foreground">
                Year {r.year}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Editable: Rev Growth */}
          <TableRow className="border-border">
            <TableCell className="font-medium text-amber-400/80 text-xs">Rev Growth %</TableCell>
            {inputs.map((inp, i) => (
              <TableCell key={i} className="text-center">
                <EditableCell value={inp.revGrowth} onChange={(v) => onInputChange(i, "revGrowth", v)} suffix="%" />
              </TableCell>
            ))}
          </TableRow>

          {/* Computed: Revenue */}
          <TableRow className="border-border">
            <TableCell className="font-medium text-xs">Revenue</TableCell>
            {rows.map((r) => (
              <TableCell key={r.year} className="text-center text-sm font-mono">
                {formatLargeNumber(r.revenue)}
              </TableCell>
            ))}
          </TableRow>

          {/* Editable: Net Margin */}
          <TableRow className="border-border">
            <TableCell className="font-medium text-amber-400/80 text-xs">Net Margin %</TableCell>
            {inputs.map((inp, i) => (
              <TableCell key={i} className="text-center">
                <EditableCell value={inp.netMargin} onChange={(v) => onInputChange(i, "netMargin", v)} suffix="%" />
              </TableCell>
            ))}
          </TableRow>

          {/* Computed: Net Income */}
          <TableRow className="border-border">
            <TableCell className="font-medium text-xs">Net Income</TableCell>
            {rows.map((r) => (
              <TableCell key={r.year} className="text-center text-sm font-mono">
                {formatLargeNumber(r.netIncome)}
              </TableCell>
            ))}
          </TableRow>

          {/* Computed: EPS */}
          <TableRow className="border-border">
            <TableCell className="font-medium text-xs">EPS</TableCell>
            {rows.map((r) => (
              <TableCell key={r.year} className="text-center text-sm font-mono">
                {formatCurrency(r.eps)}
              </TableCell>
            ))}
          </TableRow>

          {/* Editable: PE High */}
          <TableRow className="border-border">
            <TableCell className="font-medium text-amber-400/80 text-xs">PE High Est</TableCell>
            {inputs.map((inp, i) => (
              <TableCell key={i} className="text-center">
                <EditableCell value={inp.peHigh} onChange={(v) => onInputChange(i, "peHigh", v)} suffix="x" />
              </TableCell>
            ))}
          </TableRow>

          {/* Editable: PE Low */}
          <TableRow className="border-border">
            <TableCell className="font-medium text-amber-400/80 text-xs">PE Low Est</TableCell>
            {inputs.map((inp, i) => (
              <TableCell key={i} className="text-center">
                <EditableCell value={inp.peLow} onChange={(v) => onInputChange(i, "peLow", v)} suffix="x" />
              </TableCell>
            ))}
          </TableRow>

          {/* Computed: Share Price High */}
          <TableRow className="border-border bg-emerald-400/5">
            <TableCell className="font-medium text-emerald-400 text-xs">Price High</TableCell>
            {rows.map((r) => (
              <TableCell key={r.year} className="text-center text-sm font-mono text-emerald-400">
                {formatCurrency(r.sharePriceHigh)}
              </TableCell>
            ))}
          </TableRow>

          {/* Computed: Share Price Low */}
          <TableRow className="border-border bg-red-400/5">
            <TableCell className="font-medium text-red-400 text-xs">Price Low</TableCell>
            {rows.map((r) => (
              <TableCell key={r.year} className="text-center text-sm font-mono text-red-400">
                {formatCurrency(r.sharePriceLow)}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>

      {/* CAGR Summary */}
      <div className="mt-4 flex gap-6 text-sm">
        <div className="px-4 py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
          <span className="text-muted-foreground">5Y CAGR (High): </span>
          <span className="font-bold text-emerald-400">{cagrHigh.toFixed(1)}%</span>
        </div>
        <div className="px-4 py-2 rounded-lg bg-red-400/10 border border-red-400/20">
          <span className="text-muted-foreground">5Y CAGR (Low): </span>
          <span className="font-bold text-red-400">{cagrLow.toFixed(1)}%</span>
        </div>
        <div className="px-4 py-2 rounded-lg bg-secondary border border-border">
          <span className="text-muted-foreground">Current: </span>
          <span className="font-bold">{formatCurrency(currentPrice)}</span>
        </div>
      </div>
    </div>
  );
}
