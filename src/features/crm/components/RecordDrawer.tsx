import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, StickyNote, FileText, Activity, Upload, Download } from "lucide-react";
import { formatDateTime, type Attachment, type Note } from "@/features/crm/data";
import type { ReactNode } from "react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  subtitle?: string;
  details: ReactNode;
  notes?: Note[];
  attachments?: Attachment[];
  timeline?: { id: string; label: string; when: string; icon?: ReactNode }[];
}

export function RecordDrawer({ open, onOpenChange, title, subtitle, details, notes = [], attachments = [], timeline = [] }: Props) {
  const [localNotes, setLocalNotes] = useState<Note[]>(notes);
  const [localAttachments, setLocalAttachments] = useState<Attachment[]>(attachments);
  const [draft, setDraft] = useState("");

  // Sync when a new record is opened.
  const [lastTitle, setLastTitle] = useState(title);
  if (title !== lastTitle) {
    setLastTitle(title);
    setLocalNotes(notes);
    setLocalAttachments(attachments);
    setDraft("");
  }

  const addNote = () => {
    if (!draft.trim()) return;
    setLocalNotes([
      { id: `n-${Date.now()}`, author: "You", createdAt: new Date().toISOString(), body: draft.trim() },
      ...localNotes,
    ]);
    setDraft("");
  };

  const addAttachment = () => {
    const stub: Attachment = {
      id: `a-${Date.now()}`,
      name: `note-${Math.floor(Math.random() * 900 + 100)}.pdf`,
      size: "82 KB",
      uploadedAt: new Date().toISOString(),
      uploadedBy: "You",
    };
    setLocalAttachments([stub, ...localAttachments]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details"><FileText className="h-3.5 w-3.5 mr-1.5" />Details</TabsTrigger>
            <TabsTrigger value="notes"><StickyNote className="h-3.5 w-3.5 mr-1.5" />Notes</TabsTrigger>
            <TabsTrigger value="files"><Paperclip className="h-3.5 w-3.5 mr-1.5" />Files</TabsTrigger>
            <TabsTrigger value="timeline"><Activity className="h-3.5 w-3.5 mr-1.5" />Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <div className="rounded-lg border border-border bg-card p-4">{details}</div>
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-3">
            <div className="space-y-2">
              <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a note…" />
              <div className="flex justify-end">
                <Button size="sm" onClick={addNote} disabled={!draft.trim()}>Add note</Button>
              </div>
            </div>
            {localNotes.length === 0 ? (
              <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No notes yet.
              </div>
            ) : (
              <div className="space-y-2">
                {localNotes.map((n) => (
                  <div key={n.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{n.author}</span>
                      <span>{formatDateTime(n.createdAt)}</span>
                    </div>
                    <div className="mt-1 text-sm">{n.body}</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="files" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={addAttachment}>
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
              </Button>
            </div>
            {localAttachments.length === 0 ? (
              <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No attachments yet.
              </div>
            ) : (
              <div className="space-y-1.5">
                {localAttachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.name}</div>
                      <div className="text-[11px] text-muted-foreground">{a.size} · {a.uploadedBy} · {formatDateTime(a.uploadedAt)}</div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            {timeline.length === 0 ? (
              <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No activity yet.
              </div>
            ) : (
              <div className="relative ml-3 space-y-4 border-l border-border pl-4">
                {timeline.map((t) => (
                  <div key={t.id} className="relative">
                    <span className="absolute -left-[21px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary" />
                    <div className="text-sm font-medium">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{formatDateTime(t.when)}</div>
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

export function DetailGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{it.label}</dt>
          <dd className="mt-0.5 font-medium">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}