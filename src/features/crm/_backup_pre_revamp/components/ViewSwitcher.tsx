import { LayoutGrid, List, CalendarDays, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "table" | "kanban" | "calendar";

const VIEWS: { key: ViewMode; label: string; icon: LucideIcon }[] = [
  { key: "table", label: "Table", icon: List },
  { key: "kanban", label: "Kanban", icon: LayoutGrid },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
];

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  available?: ViewMode[];
}

export function ViewSwitcher({ value, onChange, available }: Props) {
  const views = available ? VIEWS.filter((v) => available.includes(v.key)) : VIEWS;
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5">
      {views.map((v) => {
        const Icon = v.icon;
        const active = value === v.key;
        return (
          <button
            key={v.key}
            type="button"
            onClick={() => onChange(v.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {v.label}
          </button>
        );
      })}
    </div>
  );
}