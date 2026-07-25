import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, Download, Trash2, Loader2 } from "lucide-react";
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  downloadAttachment,
  type EntityType,
  type AttachmentRow,
} from "@/features/attachments/api";

interface Props {
  entityType: EntityType;
  entityId: string | null | undefined;
  className?: string;
  emptyText?: string;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function AttachmentsPanel({ entityType, entityId, className, emptyText = "No files uploaded yet." }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { data = [], isLoading } = useAttachments(entityType, entityId);
  const upload = useUploadAttachment();
  const del = useDeleteAttachment();

  const onPick = () => inputRef.current?.click();
  const onFiles = async (files: FileList | null) => {
    if (!files || !entityId) return;
    for (const file of Array.from(files)) {
      await upload.mutateAsync({ entityType, entityId, file });
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  if (!entityId) {
    return (
      <div className={`rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground ${className ?? ""}`}>
        Save this record first to attach files.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Files · {data.length}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button size="sm" variant="outline" onClick={onPick} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
            Upload
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : data.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="space-y-1.5">
          {data.map((a: AttachmentRow) => (
            <div key={a.id} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
              <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.file_name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {fmtSize(a.size_bytes)} · {fmtWhen(a.created_at)}
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => downloadAttachment(a)} aria-label="Download">
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => del.mutate(a)}
                disabled={del.isPending}
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}