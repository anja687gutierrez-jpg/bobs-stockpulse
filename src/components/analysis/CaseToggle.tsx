"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CaseType } from "@/lib/types";

interface CaseToggleProps {
  activeCase: CaseType;
  onChange: (c: CaseType) => void;
}

export function CaseToggle({ activeCase, onChange }: CaseToggleProps) {
  return (
    <Tabs value={activeCase} onValueChange={(v) => onChange(v as CaseType)}>
      <TabsList className="bg-secondary">
        <TabsTrigger value="base" className="data-[state=active]:bg-amber-400/20 data-[state=active]:text-amber-400">
          Base Case
        </TabsTrigger>
        <TabsTrigger value="bull" className="data-[state=active]:bg-emerald-400/20 data-[state=active]:text-emerald-400">
          Bull Case
        </TabsTrigger>
        <TabsTrigger value="bear" className="data-[state=active]:bg-red-400/20 data-[state=active]:text-red-400">
          Bear Case
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
