import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface RowActionsProps {
  onEdit?: () => void;
  table?: string;
  id?: string;
  invalidateKeys?: (string | undefined)[][];
  onDelete?: () => Promise<void> | void;
  label?: string;
  disabled?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function RowActions({
  onEdit,
  table,
  id,
  invalidateKeys = [],
  onDelete,
  label = "this record",
  disabled,
  canEdit = true,
  canDelete = true,
}: RowActionsProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (onDelete) {
        await onDelete();
      } else if (table && id) {
        const { error } = await supabase.from(table as any).delete().eq("id", id);
        if (error) throw error;
      }
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      toast.success("Deleted");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-0.5">
      {canEdit && onEdit && (
        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={disabled} onClick={onEdit} aria-label="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      {canDelete && (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" disabled={disabled} onClick={() => setOpen(true)} aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </span>
  );
}