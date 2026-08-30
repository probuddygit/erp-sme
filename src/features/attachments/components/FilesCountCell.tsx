import { MessageSquare, Paperclip } from "lucide-react";
import { useAttachmentCounts, type EntityType } from "@/features/attachments/api";
import { useCommentCounts, type DocKind } from "@/features/shared/doc-integration";

interface Props {
  entityType: EntityType;
  entityIds: string[];
  entityId: string;
  docKind?: DocKind;
  onClick?: () => void;
}

/**
 * Renders paperclip + file count (and, when a doc kind is supplied, a comment
 * count) for a single row. Counts for the whole page are fetched in one query
 * keyed by the ids list so every row shares the fetch.
 */
export function FilesCountCell({ entityType, entityIds, entityId, docKind, onClick }: Props) {
  const { data } = useAttachmentCounts(entityType, entityIds);
  const { data: commentCounts } = useCommentCounts(docKind ?? "invoice", docKind ? entityIds : []);
  const count = data?.[entityId] ?? 0;
  const comments = commentCounts?.[entityId] ?? 0;

  const content = (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{count}</span>
      {docKind && <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{comments}</span>}
    </span>
  );

  if (!onClick) return content;
  return (
    <button type="button" onClick={onClick} className="rounded px-1 py-0.5 hover:bg-muted" title="Open document">
      {content}
    </button>
  );
}
