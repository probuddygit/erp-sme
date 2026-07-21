import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  features?: string[];
}

export function EmptyModule({ icon: Icon, title, description, features }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 shadow-sm">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="relative">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-primary-foreground shadow-sm"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Icon className="h-8 w-8" />
          </div>
        </div>
        <Badge variant="secondary" className="mt-5 gap-1.5">
          <Sparkles className="h-3 w-3" />
          Coming soon
        </Badge>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">{description}</p>

        {features && features.length > 0 && (
          <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f}
                className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-left text-sm text-foreground"
              >
                {f}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}