import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight, Mail, MailOpen, Plus } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { EMAILS, formatDateTime, type EmailRecord } from "@/features/crm/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/crm/email-history")({
  component: EmailHistoryPage,
});

function EmailHistoryPage() {
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState("");
  const [selected, setSelected] = useState<EmailRecord | null>(EMAILS[0] ?? null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return EMAILS.filter((e) => {
      if (direction && e.direction !== direction) return false;
      if (!term) return true;
      return [e.subject, e.from, e.to, e.preview].some((v) => v.toLowerCase().includes(term));
    });
  }, [search, direction]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search email history…"
            filters={[
              { key: "direction", label: "Direction", value: direction, onChange: setDirection, options: [
                { value: "inbound", label: "Inbound" }, { value: "outbound", label: "Outbound" },
              ] },
            ]}
            actions={<Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Compose</Button>}
          />

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="rounded-lg border border-border divide-y divide-border max-h-[520px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No emails found.</div>
              ) : filtered.map((e) => {
                const active = selected?.id === e.id;
                return (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className={cn(
                      "block w-full px-3 py-2.5 text-left transition-colors",
                      active ? "bg-primary/5" : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {e.direction === "inbound"
                        ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                        : <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />}
                      <span className={cn("truncate text-sm", !e.opened && "font-semibold")}>{e.subject}</span>
                      {!e.opened && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {e.direction === "inbound" ? e.from : `To: ${e.to}`}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate">{e.preview}</span>
                      <span className="ml-2 shrink-0">{formatDateTime(e.sentAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-border p-4">
              {selected ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        {selected.opened ? <MailOpen className="h-5 w-5 text-muted-foreground" /> : <Mail className="h-5 w-5 text-primary" />}
                        {selected.subject}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{selected.from}</span> → {selected.to}
                      </div>
                    </div>
                    <StatusBadge
                      label={selected.direction}
                      tone={selected.direction === "inbound" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(selected.sentAt)}</div>
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed">
                    {selected.preview}
                    <p className="mt-3 text-muted-foreground">
                      — This is a sample preview. Full message body would render here.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline">Reply</Button>
                    <Button size="sm" variant="outline">Forward</Button>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">Select an email to preview.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}