import { useState, type ReactNode } from "react";
import { DataListPage, type Column } from "./DataListPage";
import { exportRowsToCsv } from "./admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type FieldType = "text" | "number" | "textarea" | "switch" | "select" | "date" | "email" | "password";

export interface AdminField {
  name: string;
  label: string;
  type?: FieldType;
  options?: { label: string; value: string }[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  default?: any;
}

export function FieldInput({ field, value, onChange }: { field: AdminField; value: any; onChange: (v: any) => void }) {
  const t = field.type ?? "text";
  if (t === "switch") {
    return <Switch checked={!!value} onCheckedChange={onChange} />;
  }
  if (t === "textarea") {
    return <Textarea rows={3} value={value ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  if (t === "select") {
    return (
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={field.placeholder ?? "Select…"} /></SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      type={t === "number" ? "number" : t === "date" ? "date" : t === "email" ? "email" : t === "password" ? "password" : "text"}
      value={value ?? ""}
      placeholder={field.placeholder}
      onChange={(e) => onChange(t === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
    />
  );
}

export function RecordFormDialog({
  open, onOpenChange, title, description, fields, initial, onSubmit, submitLabel = "Save",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  fields: AdminField[];
  initial?: Record<string, any> | null;
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
  submitLabel?: string;
}) {
  const seed = () => {
    const base: Record<string, any> = {};
    fields.forEach((f) => { base[f.name] = initial?.[f.name] ?? f.default ?? (f.type === "switch" ? false : ""); });
    return base;
  };
  const [values, setValues] = useState<Record<string, any>>(seed);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(0);

  // reseed when the dialog is (re)opened for a different record
  const openKey = `${open}-${initial?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState(openKey);
  if (openKey !== lastKey) {
    setLastKey(openKey);
    setValues(seed());
    setKey((k) => k + 1);
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" key={key}>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name} className={"space-y-2 " + (f.full || f.type === "textarea" ? "sm:col-span-2" : "")}>
                <Label htmlFor={f.name}>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                <FieldInput field={f} value={values[f.name]} onChange={(v) => setValues((p) => ({ ...p, [f.name]: v }))} />
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface CrudListProps<T extends { id: string }> {
  entity: string;
  rows: T[];
  columns: Column<T>[];
  fields: AdminField[];
  searchKeys?: string[];
  loading?: boolean;
  onCreate?: (values: Record<string, any>) => Promise<void> | void;
  onUpdate?: (id: string, values: Record<string, any>) => Promise<void> | void;
  onDelete?: (row: T) => Promise<void> | void;
  actionLabel?: string;
  extraActions?: ReactNode;
  rowExtra?: (row: T) => ReactNode;
  toForm?: (row: T) => Record<string, any>;
  emptyLabel?: string;
}

export function CrudList<T extends { id: string }>({
  entity, rows, columns, fields, searchKeys = [], loading, onCreate, onUpdate, onDelete,
  actionLabel, extraActions, rowExtra, toForm, emptyLabel,
}: CrudListProps<T>) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [confirm, setConfirm] = useState<T | null>(null);

  return (
    <>
      <DataListPage<T>
        rows={rows}
        columns={columns}
        searchKeys={searchKeys}
        loading={loading}
        emptyLabel={emptyLabel ?? `No ${entity.toLowerCase()} records yet`}
        actionLabel={actionLabel ?? `New ${entity.toLowerCase()}`}
        onAction={onCreate ? () => { setEditing(null); setOpen(true); } : undefined}
        extraActions={extraActions}
        rowExtra={rowExtra}
        onEdit={onUpdate ? (r) => { setEditing(r); setOpen(true); } : undefined}
        onDelete={onDelete ? (r) => setConfirm(r) : undefined}
        onExport={() => exportRowsToCsv(
          entity.toLowerCase().replace(/\s+/g, "-"),
          rows,
          columns.map((c) => ({ key: String(c.key), header: c.header })),
        )}
      />

      <RecordFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${entity.toLowerCase()}` : `New ${entity.toLowerCase()}`}
        fields={fields}
        initial={editing ? (toForm ? { id: editing.id, ...toForm(editing) } : (editing as any)) : null}
        onSubmit={async (values) => {
          if (editing) await onUpdate?.(editing.id, values);
          else await onCreate?.(values);
        }}
      />

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {entity.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { const r = confirm; setConfirm(null); if (r) await onDelete?.(r); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
