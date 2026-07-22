import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Paperclip, MessageSquare, Clock3, History, FileText, Printer, Mail, Download } from "lucide-react";
import {
  ENTRY_META, STATUS_TONES, formatDate, formatDateTime, formatINR,
  type FinanceEntry,
} from "@/features/finance/data";
import { StatusBadge } from "./StatusBadge";

interface Props {
  entry: FinanceEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EntryDrawer({ entry, open, onOpenChange }: Props) {
  if (!entry) return null;
  const meta = ENTRY_META[entry.type];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-2xl">
        <SheetHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg">{entry.number}</SheetTitle>
            <StatusBadge label={entry.status} tone={STATUS_TONES[entry.status]} />
          </div>
          <div className="text-xs text-muted-foreground">
            {meta.label} · {formatDate(entry.date)} · Created by {entry.createdBy}
          </div>
        </SheetHeader>

        <div className="mt-3 flex flex-wrap gap-2 border-b border-border pb-3">
          <Button size="sm" variant="outline"><Printer className="mr-1.5 h-3.5 w-3.5" />Print</Button>
          <Button size="sm" variant="outline"><Mail className="mr-1.5 h-3.5 w-3.5" />Email</Button>
          <Button size="sm" variant="outline"><Download className="mr-1.5 h-3.5 w-3.5" />PDF</Button>
          {entry.status === "draft" && <Button size="sm">Post entry</Button>}
        </div>

        <Tabs defaultValue="details" className="mt-3 flex-1 overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details"><FileText className="mr-1.5 h-3.5 w-3.5" />Details</TabsTrigger>
            <TabsTrigger value="files"><Paperclip className="mr-1.5 h-3.5 w-3.5" />Files</TabsTrigger>
            <TabsTrigger value="comments"><MessageSquare className="mr-1.5 h-3.5 w-3.5" />Comments</TabsTrigger>
            <TabsTrigger value="timeline"><Clock3 className="mr-1.5 h-3.5 w-3.5" />Timeline</TabsTrigger>
            <TabsTrigger value="audit"><History className="mr-1.5 h-3.5 w-3.5" />Audit</TabsTrigger>
          </TabsList>

          <div className="mt-3 flex-1 overflow-y-auto pr-1">
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <Info label="Type" value={meta.label} />
                <Info label="Date" value={formatDate(entry.date)} />
                <Info label="Status" value={entry.status} capitalize />
                <Info label="Approval" value={entry.approvalStatus} capitalize />
                {entry.party && <Info label="Party" value={`${entry.party} (${entry.partyCode ?? "—"})`} />}
                {entry.reference && <Info label="Reference" value={entry.reference} />}
                {entry.mode && <Info label="Payment mode" value={entry.mode.toUpperCase()} />}
                {entry.instrument && <Info label="Instrument" value={entry.instrument} />}
              </div>

              <div>
                <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">Narration</div>
                <div className="rounded-md border border-border bg-card p-3 text-sm">{entry.narration}</div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Account</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-right">Debit</th>
                      <th className="px-3 py-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {entry.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{l.accountName}</div>
                          <div className="text-[11px] text-muted-foreground">{l.accountCode}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{l.description ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-medium">{l.debit ? formatINR(l.debit) : "—"}</td>
                        <td className="px-3 py-2 text-right font-medium">{l.credit ? formatINR(l.credit) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 text-sm font-semibold">
                    <tr>
                      <td className="px-3 py-2" colSpan={2}>Total</td>
                      <td className="px-3 py-2 text-right">{formatINR(entry.totalDebit)}</td>
                      <td className="px-3 py-2 text-right">{formatINR(entry.totalCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="files" className="space-y-2">
              {entry.attachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-[11px] text-muted-foreground">{a.size} · uploaded {formatDate(a.uploadedAt)} by {a.uploadedBy}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">Download</Button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="comments" className="space-y-2">
              {entry.comments.map((c) => (
                <div key={c.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{c.author}</span>
                    <span>{formatDateTime(c.when)}</span>
                  </div>
                  <p>{c.body}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-2">
              {entry.timeline.map((t) => (
                <div key={t.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <div className="font-medium">{t.label}</div>
                    <div className="text-[11px] text-muted-foreground">{formatDateTime(t.when)}{t.actor ? ` · ${t.actor}` : ""}</div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="audit" className="space-y-2">
              {entry.audit.map((a) => (
                <div key={a.id} className="rounded-md border border-border p-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium">{a.actor}</span>
                    <span className="text-muted-foreground">{formatDateTime(a.when)}</span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">{a.action}{a.from ? ` — ${a.from} → ${a.to}` : ""}</div>
                </div>
              ))}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={capitalize ? "capitalize" : ""}>{value}</div>
    </div>
  );
}