import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { MASTERS } from "@/features/masters/registry";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace/masters/")({
  component: MastersIndex,
});

function MastersIndex() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {MASTERS.map((m) => {
        const Icon = m.icon;
        return (
          <Link key={m.key} to="/workspace/masters/$master" params={{ master: m.key }}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">{m.label}</div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {m.description}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}