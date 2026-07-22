import { cn } from "@/lib/utils";

export function StatusBadge({ label, tone }: { label: string; tone?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium capitalize",
        tone ?? "bg-slate-100 text-slate-700 border-slate-200",
      )}
    >
      {label}
    </span>
  );
}