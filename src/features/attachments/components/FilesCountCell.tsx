import { Paperclip } from "lucide-react";
import { useAttachmentCounts, type EntityType } from "@/features/attachments/api";

interface Props {
  entityType: EntityType;
  entityIds: string[];
  entityId: string;
}

/**
 * Renders paperclip + count for a single row. Prefetches ALL counts in one
 * query keyed by the ids list so every row in a page shares the fetch.
 */
export function FilesCountCell({ entityType, entityIds, entityId }: Props) {
  const { data } = useAttachmentCounts(entityType, entityIds);
  const count = data?.[entityId] ?? 0;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Paperclip className="h-3 w-3" />
      {count}
    </span>
  );
}