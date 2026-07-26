import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, MinusCircle, AlertTriangle } from "lucide-react";
import type { PostingStatus } from "./doc-integration";

const map: Record<PostingStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300", Icon: Clock },
  posted: { label: "Posted", cls: "bg-green-500/15 text-green-700 dark:text-green-300", Icon: CheckCircle2 },
  failed: { label: "Failed", cls: "bg-red-500/15 text-red-700 dark:text-red-300", Icon: XCircle },
  skipped: { label: "Skipped", cls: "bg-muted text-muted-foreground", Icon: MinusCircle },
  not_applicable: { label: "N/A", cls: "bg-muted text-muted-foreground", Icon: MinusCircle },
};

function Pill({ label, status }: { label: string; status?: PostingStatus | null }) {
  const cfg = map[status ?? "pending"];
  const Icon = cfg.Icon;
  return (
    <Badge variant="secondary" className={`gap-1 ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
      <span className="font-medium">{cfg.label}</span>
    </Badge>
  );
}

export interface DocMetaBadgesProps {
  financial?: PostingStatus | null;
  inventory?: PostingStatus | null;
  gst?: PostingStatus | null;
  notification?: PostingStatus | null;
}

export function DocMetaBadges({ financial, inventory, gst, notification }: DocMetaBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {financial !== undefined && <Pill label="Fin" status={financial} />}
      {inventory !== undefined && <Pill label="Inv" status={inventory} />}
      {gst !== undefined && <Pill label="GST" status={gst} />}
      {notification !== undefined && <Pill label="Notif" status={notification} />}
    </div>
  );
}

export function ApprovalBadge({ status }: { status?: string | null }) {
  if (!status || status === "not_required") return null;
  const cls =
    status === "approved"
      ? "bg-green-500/15 text-green-700 dark:text-green-300"
      : status === "rejected"
      ? "bg-red-500/15 text-red-700 dark:text-red-300"
      : "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return (
    <Badge variant="secondary" className={`gap-1 ${cls}`}>
      <AlertTriangle className="h-3 w-3" />
      Approval: {status.replace("_", " ")}
    </Badge>
  );
}