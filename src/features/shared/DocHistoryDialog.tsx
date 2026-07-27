import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { useState } from "react";
import { DocHistoryPanel } from "./DocHistoryPanel";
import type { DocKind } from "./doc-integration";

export function DocHistoryButton({ kind, id, label }: { kind: DocKind; id: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOpen(true)} aria-label="History">
        <History className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{label ?? "Document"} history</DialogTitle>
          </DialogHeader>
          <DocHistoryPanel kind={kind} id={id} />
        </DialogContent>
      </Dialog>
    </>
  );
}