import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Paperclip, ShieldCheck, Activity, MessageSquare, History,
  Printer, Mail, Send, Link2,
} from "lucide-react";
import { AttachmentsPanel } from "@/features/attachments/components/AttachmentsPanel";
import type { EntityType } from "@/features/attachments/api";
import {
  useAddComment, useDocumentComments, useDocumentEvents, useDocumentLinks, type DocKind,
} from "@/features/shared/doc-integration";
import { useApprovalFor } from "@/features/shared/approval-api";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  subtitle?: string;
  status?: string;
  docKind: DocKind;
  entityType: EntityType;
  entityId: string;
  details?: React.ReactNode;
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function DocDrawer({
  open, onOpenChange, title, subtitle, status, docKind, entityType, entityId, details,
}: Props) {
  const { data: comments = [] } = useDocumentComments(docKind, entityId);
  const { data: events = [] } = useDocumentEvents(docKind, entityId);
  const { data: links = [] } = useDocumentLinks(docKind, entityId);
  const { data: approval } = useApprovalFor(entityType, entityId);
  const addComment = useAddComment(docKind, entityId);
  const [body, setBody] = useState("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl">{title}</SheetTitle>
              {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {status && <Badge variant="outline" className="capitalize">{status.replace(/_/g, " ")}</Badge>}
              {approval && (
                <Badge variant="outline" className="capitalize text-amber-600 border-amber-300">
                  Approval: {approval.status}
                </Badge>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />Print
            </Button>
            <Button size="sm" variant="outline" onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(title)}`; }}>
              <Mail className="mr-1.5 h-3.5 w-3.5" />Email
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const text = `${title}${subtitle ? ` · ${subtitle}` : ""}`;
                if (navigator.share) { await navigator.share({ title, text }).catch(() => {}); return; }
                await navigator.clipboard.writeText(text);
                toast.success("Document reference copied");
              }}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />Send to vendor
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-5">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="details" title="Details"><FileText className="h-3.5 w-3.5" /></TabsTrigger>
            <TabsTrigger value="files" title="Files"><Paperclip className="h-3.5 w-3.5" /></TabsTrigger>
            <TabsTrigger value="approval" title="Approval"><ShieldCheck className="h-3.5 w-3.5" /></TabsTrigger>
            <TabsTrigger value="activity" title="Activity"><Activity className="h-3.5 w-3.5" /></TabsTrigger>
            <TabsTrigger value="comments" title="Comments"><MessageSquare className="h-3.5 w-3.5" /></TabsTrigger>
            <TabsTrigger value="links" title="Linked documents"><History className="h-3.5 w-3.5" /></TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-4">
            {details ?? <p className="text-sm text-muted-foreground">No additional details.</p>}
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <AttachmentsPanel entityType={entityType} entityId={entityId} />
          </TabsContent>

          <TabsContent value="approval" className="mt-4 space-y-2 text-sm">
            {!approval ? (
              <p className="text-sm text-muted-foreground">No approval workflow attached to this document.</p>
            ) : (
              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{approval.rule_name ?? "Approval"}</span>
                  <Badge variant="outline" className="capitalize">{approval.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Step {approval.current_step} of {approval.total_steps} · raised {when(approval.created_at)}
                </div>
                {approval.notes && <div className="text-xs">{approval.notes}</div>}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <div className="space-y-1 text-sm">
                {events.map((e) => (
                  <div key={e.id} className="flex items-baseline gap-2 border-b border-border/40 py-1.5">
                    <Activity className="h-3 w-3 text-primary" />
                    <span className="font-mono text-xs text-primary">{e.event}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{when(e.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="comments" className="mt-4 space-y-3">
            <div className="max-h-72 space-y-2 overflow-auto">
              {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="border-l-2 border-primary/30 py-1 pl-3 text-sm">
                  <div className="text-xs text-muted-foreground">{when(c.created_at)}</div>
                  <div className="whitespace-pre-wrap">{c.body}</div>
                </div>
              ))}
            </div>
            <Textarea rows={2} placeholder="Add a comment…" value={body} onChange={(e) => setBody(e.target.value)} />
            <Button
              size="sm"
              disabled={!body.trim() || addComment.isPending}
              onClick={() => addComment.mutate(body, { onSuccess: () => setBody("") })}
            >
              Post comment
            </Button>
          </TabsContent>

          <TabsContent value="links" className="mt-4">
            {links.length === 0 ? (
              <p className="text-sm text-muted-foreground">No linked documents.</p>
            ) : (
              <div className="space-y-1 text-sm">
                {links.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 border-b border-border/40 py-1.5">
                    <Link2 className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono text-xs">{l.source_kind}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono text-xs">{l.destination_kind}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{when(l.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
