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
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        tone ?? "bg-muted text-foreground border-border",
        className,
      )}
    >
      {label}
    </span>
  );
}