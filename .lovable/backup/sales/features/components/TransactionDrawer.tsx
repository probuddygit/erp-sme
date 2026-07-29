import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Paperclip,
  MessageSquare,
  Activity,
  ShieldCheck,
  History,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  Send,
  Printer,
  Mail,
} from "lucide-react";
import {
  APPROVAL_TONES,
  STATUS_TONES,
  formatDate,
  formatDateTime,
  formatINR,
  type Attachment,
  type Comment,
  type Transaction,
  DOC_META,
} from "@/features/sales/data";
import { StatusBadge } from "@/features/sales/components/StatusBadge";

interface Props {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function TransactionDrawer({ transaction, open, onOpenChange }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [draft, setDraft] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);

  if (transaction && transaction.id !== lastId) {
    setLastId(transaction.id);
    setComments(transaction.comments);
    setAttachments(transaction.attachments);
    setDraft("");
  }

  if (!transaction) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl" />
      </Sheet>
    );
  }

  const meta = DOC_META[transaction.docType];

  const addComment = () => {
    if (!draft.trim()) return;
    setComments([
      { id: `cm-${Date.now()}`, author: "You", createdAt: new Date().toISOString(), body: draft.trim() },
      ...comments,
    ]);
    setDraft("");
  };

  const addAttachment = () => {
    setAttachments([
      {
        id: `at-${Date.now()}`,
        name: `upload-${Math.floor(Math.random() * 900 + 100)}.pdf`,
        size: `${Math.floor(Math.random() * 400 + 50)} KB`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "You",
      },
      ...attachments,
    ]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl">
                {meta.label} · {transaction.number}
              </SheetTitle>
              <SheetDescription>
                {transaction.customer} · {formatDate(transaction.date)}
              </SheetDescription>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <StatusBadge label={transaction.status.replace(/_/g, " ")} tone={STATUS_TONES[transaction.status]} />
              <StatusBadge
                label={`Approval: ${transaction.approvalStatus}`}
                tone={APPROVAL_TONES[transaction.approvalStatus]}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline"><Printer className="mr-1.5 h-3.5 w-3.5" />Print</Button>
            <Button size="sm" variant="outline"><Mail className="mr-1.5 h-3.5 w-3.5" />Email</Button>
            <Button size="sm" variant="outline"><Send className="mr-1.5 h-3.5 w-3.5" />Send</Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-5">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="details"><FileText className="h-3.5 w-3.5" /></TabsTrigger>
            <TabsTrigger value="files"><Paperclip className="h-3.5 w-3.5" /></TabsTrigger>
            <TabsTrigger value="approval"><ShieldCheck className="h-3.5 w-3.5" /></TabsTrigger>
            <TabsTrigger value="timeline"><Activity className="h-3.5 w-3.5" /></TabsTrigger>
            <TabsTrigger value="comments"><MessageSquare className="h-3.5 w-3.5" /></TabsTrigger>
            <TabsTrigger value="audit"><History className="h-3.5 w-3.5" /></TabsTrigger>
          </TabsList>

          {/* DETAILS */}
          <TabsContent value="details" className="mt-4 space-y-4">
            <HeaderBlock tx={transaction} />
            <ItemsGrid tx={transaction} />
            <TaxesBlock tx={transaction} />
            {(transaction.notes || transaction.terms) && (
              <div className="grid gap-3 md:grid-cols-2">
                {transaction.notes && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Notes</div>
                    <div className="mt-1 text-sm">{transaction.notes}</div>
                  </div>
                )}
                {transaction.terms && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Terms & Conditions</div>
                    <div className="mt-1 text-sm">{transaction.terms}</div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* FILES */}
          <TabsContent value="files" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={addAttachment}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />Upload
              </Button>
            </div>
            {attachments.length === 0 ? (
              <EmptyState message="No attachments yet." />
            ) : (
              <div className="space-y-1.5">
                {attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {a.size} · {a.uploadedBy} · {formatDateTime(a.uploadedAt)}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8"><Download className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* APPROVAL */}
          <TabsContent value="approval" className="mt-4 space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Current status</div>
                  <div className="mt-1">
                    <StatusBadge label={transaction.approvalStatus} tone={APPROVAL_TONES[transaction.approvalStatus]} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Approver</div>
                  <div className="mt-1 text-sm font-medium">{transaction.approver ?? "—"}</div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Approval workflow</div>
              <ol className="mt-3 space-y-3">
                {["Submitted by rep", "Sales Manager review", "Finance sign-off (if > ₹1L)"].map((step, i) => (
                  <li key={step} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{i + 1}</span>
                    <div>
                      <div className="font-medium">{step}</div>
                      <div className="text-xs text-muted-foreground">
                        {i === 0 ? transaction.ownerRep : i === 1 ? transaction.approver ?? "Pending" : "Auto-triggered"}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline"><XCircle className="mr-1.5 h-3.5 w-3.5" />Reject</Button>
              <Button size="sm"><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Approve</Button>
            </div>
          </TabsContent>

          {/* TIMELINE */}
          <TabsContent value="timeline" className="mt-4">
            {transaction.timeline.length === 0 ? (
              <EmptyState message="No activity yet." />
            ) : (
              <div className="relative ml-3 space-y-4 border-l border-border pl-4">
                {transaction.timeline.map((t) => (
                  <div key={t.id} className="relative">
                    <span className="absolute -left-[21px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary" />
                    <div className="text-sm font-medium">{t.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(t.when)}{t.actor ? ` · ${t.actor}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* COMMENTS */}
          <TabsContent value="comments" className="mt-4 space-y-3">
            <div className="space-y-2">
              <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a comment…" />
              <div className="flex justify-end">
                <Button size="sm" onClick={addComment} disabled={!draft.trim()}>Post</Button>
              </div>
            </div>
            {comments.length === 0 ? (
              <EmptyState message="No comments yet." />
            ) : (
              <div className="space-y-2">
                {comments.map((c) => (
                  <div key={c.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{c.author}</span>
                      <span>{formatDateTime(c.createdAt)}</span>
                    </div>
                    <div className="mt-1 text-sm">{c.body}</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* AUDIT */}
          <TabsContent value="audit" className="mt-4">
            {transaction.audit.length === 0 ? (
              <EmptyState message="No audit entries yet." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">When</th>
                      <th className="px-3 py-2 text-left font-medium">Actor</th>
                      <th className="px-3 py-2 text-left font-medium">Action</th>
                      <th className="px-3 py-2 text-left font-medium">Field</th>
                      <th className="px-3 py-2 text-left font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transaction.audit.map((a) => (
                      <tr key={a.id}>
                        <td className="px-3 py-2 text-muted-foreground">{formatDateTime(a.when)}</td>
                        <td className="px-3 py-2 font-medium">{a.actor}</td>
                        <td className="px-3 py-2">{a.action}</td>
                        <td className="px-3 py-2 text-muted-foreground">{a.field ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {a.from || a.to ? `${a.from ?? "—"} → ${a.to ?? "—"}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function HeaderBlock({ tx }: { tx: Transaction }) {
  const rows: { label: string; value: string }[] = [
    { label: "Document #", value: tx.number },
    { label: "Date", value: formatDate(tx.date) },
    { label: "Customer", value: `${tx.customer} (${tx.customerCode})` },
    { label: "GSTIN", value: tx.gstin ?? "—" },
    { label: "Sales Rep", value: tx.ownerRep },
    { label: "Reference", value: tx.reference ?? "—" },
  ];
  if (tx.validUntil)     rows.push({ label: "Valid Until",   value: formatDate(tx.validUntil) });
  if (tx.deliveryDate)   rows.push({ label: "Delivery Date", value: formatDate(tx.deliveryDate) });
  if (tx.dueDate)        rows.push({ label: "Due Date",      value: formatDate(tx.dueDate) });
  if (tx.paymentDate)    rows.push({ label: "Payment Date",  value: formatDate(tx.paymentDate) });
  if (tx.paymentMode)    rows.push({ label: "Mode",          value: tx.paymentMode });
  if (tx.paidAgainst)    rows.push({ label: "Paid Against",  value: tx.paidAgainst });

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.label}</dt>
            <dd className="mt-0.5 truncate font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <AddressBox label="Billing address" value={tx.billingAddress} />
        <AddressBox label="Shipping address" value={tx.shippingAddress} />
      </div>
    </div>
  );
}

function AddressBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 whitespace-pre-line text-sm">{value}</div>
    </div>
  );
}

function ItemsGrid({ tx }: { tx: Transaction }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-muted/50 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Items
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Item</th>
              <th className="px-3 py-2 text-left font-medium">HSN</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Rate</th>
              <th className="px-3 py-2 text-right font-medium">Disc %</th>
              <th className="px-3 py-2 text-right font-medium">GST</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tx.items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2">
                  <div className="font-medium">{it.description}</div>
                  <div className="text-[11px] text-muted-foreground">{it.code}</div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{it.hsn}</td>
                <td className="px-3 py-2 text-right">{it.qty} {it.uom}</td>
                <td className="px-3 py-2 text-right">{formatINR(it.rate)}</td>
                <td className="px-3 py-2 text-right">{it.discountPct}%</td>
                <td className="px-3 py-2 text-right">{it.taxRate}%</td>
                <td className="px-3 py-2 text-right font-medium">{formatINR(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaxesBlock({ tx }: { tx: Transaction }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tax breakup</div>
        <div className="mt-2 space-y-1.5 text-sm">
          {tx.taxes.length === 0 && <div className="text-muted-foreground">No taxes applied.</div>}
          {tx.taxes.map((t) => (
            <div key={t.id} className="flex items-center justify-between">
              <span>{t.label}</span>
              <span className="font-medium">{formatINR(t.amount)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Summary</div>
        <div className="mt-2 space-y-1.5 text-sm">
          <Row label="Sub total"   value={formatINR(tx.subTotal)} />
          <Row label="Discount"    value={`- ${formatINR(tx.discountTotal)}`} />
          <Row label="Taxes"       value={formatINR(tx.taxTotal)} />
          <Row label="Round off"   value={formatINR(tx.roundOff)} />
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Grand total</span>
            <span>{formatINR(tx.grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}