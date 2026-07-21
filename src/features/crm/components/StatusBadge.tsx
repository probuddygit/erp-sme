import { cn } from "@/lib/utils";

interface Props {
  label: string;
  tone?: string;
  className?: string;
}

export function StatusBadge({ label, tone, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone ?? "bg-muted text-foreground border-border",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: "low" | "medium" | "high" }) {
  const tone =
    priority === "high" ? "bg-rose-500" : priority === "medium" ? "bg-amber-500" : "bg-slate-400";
  return <span className={cn("inline-block h-2 w-2 rounded-full", tone)} aria-label={priority} />;
}