import { Flame, ThermometerSun, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadScoreResult } from "@/features/crm/api";

export function ScoreBadge({ result, className }: { result: LeadScoreResult; className?: string }) {
  const tone =
    result.band === "hot"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : result.band === "warm"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-slate-100 text-slate-600 border-slate-200";
  const Icon = result.band === "hot" ? Flame : result.band === "warm" ? ThermometerSun : Snowflake;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", tone, className)}>
      <Icon className="h-3 w-3" />
      {result.score}
      <span className="opacity-70 capitalize">{result.band}</span>
    </span>
  );
}