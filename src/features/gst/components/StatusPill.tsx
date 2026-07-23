import { cn } from "@/lib/utils";
import { STATUS_TONES } from "../data";

const TONE: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  amber:   "bg-amber-500/15 text-amber-600 border-amber-500/30",
  sky:     "bg-sky-500/15 text-sky-600 border-sky-500/30",
  rose:    "bg-rose-500/15 text-rose-600 border-rose-500/30",
  slate:   "bg-slate-500/15 text-slate-600 border-slate-500/30",
};

export function StatusPill({ label }: { label: string }) {
  const tone = STATUS_TONES[label] ?? "slate";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", TONE[tone])}>
      {label}
    </span>
  );
}