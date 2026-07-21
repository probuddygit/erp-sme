import type { LucideIcon } from "lucide-react";

export type FieldType =
  | "text"
  | "number"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "boolean"
  | "date";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Show in table columns */
  showInList?: boolean;
  /** Include when exporting to Excel */
  showInExport?: boolean;
  /** Uppercase text on input */
  uppercase?: boolean;
  /** Default value on create */
  defaultValue?: unknown;
  /** Column width class for table */
  colClass?: string;
  /** Format value for display */
  format?: (v: unknown, row: Record<string, unknown>) => string;
  /** Grid span in the create/edit form (1 or 2 cols) */
  span?: 1 | 2;
}

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface MasterDef {
  key: string;
  label: string;
  singular: string;
  description: string;
  icon: LucideIcon;
  table: string;
  /** Field name used to identify a row in messages and audit */
  nameField: string;
  /** Column used for default sort */
  orderBy?: string;
  orderDir?: "asc" | "desc";
  fields: FieldDef[];
  filters?: FilterDef[];
  /** Extra column fixed at DB insert (e.g. company_id handled automatically) */
  approvalEntity?: string;
  /** Roles that can create/edit/delete (in addition to admin) */
  editorRoles?: string[];
}