import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReactNode } from "react";

export interface FilterOption { value: string; label: string; }
export interface FilterSpec {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
}

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  placeholder?: string;
  filters?: FilterSpec[];
  actions?: ReactNode;
}

export function FilterBar({ search, onSearchChange, placeholder, filters, actions }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[240px] flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder ?? "Search…"}
          className="pl-9"
        />
      </div>
      {(filters ?? []).map((f) => (
        <Select key={f.key} value={f.value || "__all__"} onValueChange={(v) => f.onChange(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={f.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All {f.label}</SelectItem>
            {f.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}