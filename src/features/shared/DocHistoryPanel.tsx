import { useState } from "react";
import { useAddComment, useDocumentComments, useDocumentEvents, useDocumentLinks, type DocKind } from "./doc-integration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Activity, Link2 } from "lucide-react";

export function DocHistoryPanel({ kind, id }: { kind: DocKind; id?: string }) {
  const { data: comments = [] } = useDocumentComments(kind, id);
  const { data: events = [] } = useDocumentEvents(kind, id);
  const { data: links = [] } = useDocumentLinks(kind, id);
  const addComment = useAddComment(kind, id);
  const [body, setBody] = useState("");

  if (!id) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">History & Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="comments">
          <TabsList>
            <TabsTrigger value="comments"><MessageSquare className="h-3.5 w-3.5 mr-1" />Comments ({comments.length})</TabsTrigger>
            <TabsTrigger value="events"><Activity className="h-3.5 w-3.5 mr-1" />Events ({events.length})</TabsTrigger>
            <TabsTrigger value="links"><Link2 className="h-3.5 w-3.5 mr-1" />Linked ({links.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="comments" className="space-y-3">
            <div className="space-y-2 max-h-64 overflow-auto">
              {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="text-sm border-l-2 border-primary/30 pl-3 py-1">
                  <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                  <div className="whitespace-pre-wrap">{c.body}</div>
                </div>
              ))}
            </div>
            <Textarea rows={2} placeholder="Add a comment…" value={body} onChange={(e) => setBody(e.target.value)} />
            <Button size="sm" disabled={!body.trim() || addComment.isPending} onClick={() => { addComment.mutate(body, { onSuccess: () => setBody("") }); }}>Post</Button>
          </TabsContent>
          <TabsContent value="events">
            <div className="space-y-1 max-h-72 overflow-auto text-sm">
              {events.length === 0 && <p className="text-xs text-muted-foreground">No downstream events recorded.</p>}
              {events.map((e) => (
                <div key={e.id} className="flex items-baseline gap-2 border-b border-border/40 py-1.5">
                  <span className="font-mono text-xs text-primary">{e.event}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(e.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="links">
            <div className="space-y-1 max-h-72 overflow-auto text-sm">
              {links.length === 0 && <p className="text-xs text-muted-foreground">No linked documents.</p>}
              {links.map((l) => (
                <div key={l.id} className="flex items-center gap-2 border-b border-border/40 py-1.5">
                  <span className="font-mono text-xs">{l.source_kind}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono text-xs">{l.destination_kind}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}