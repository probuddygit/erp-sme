import { createFileRoute } from "@tanstack/react-router";
import { CrudList } from "@/features/admin/CrudList";
import { Pill } from "@/features/admin/DataListPage";
import { useSettingsCollection, type CollectionRow } from "@/features/admin/admin-api";

export const Route = createFileRoute("/_authenticated/workspace/administration/document-numbering")({
  component: NumberingPage,
});

const SEED: CollectionRow[] = [
  { id: "n1", document: "Sales Invoice", prefix: "INV/26-27/", suffix: "", next: 241, reset: "Yearly", status: "Active" },
  { id: "n2", document: "Sales Order", prefix: "SO/26-27/", suffix: "", next: 512, reset: "Yearly", status: "Active" },
  { id: "n3", document: "Quotation", prefix: "QT/26-27/", suffix: "", next: 188, reset: "Yearly", status: "Active" },
  { id: "n4", document: "Purchase Order", prefix: "PO/26-27/", suffix: "", next: 306, reset: "Yearly", status: "Active" },
  { id: "n5", document: "GRN", prefix: "GRN/26-27/", suffix: "", next: 278, reset: "Yearly", status: "Active" },
];

function NumberingPage() {
  const { rows, isLoading, create, update, remove } = useSettingsCollection("admin.doc_numbering", SEED);
  return (
    <CrudList
      entity="Series"
      actionLabel="New series"
      loading={isLoading}
      rows={rows}
      searchKeys={["document", "prefix"]}
      columns={[
        { key: "document", header: "Document" },
        { key: "prefix", header: "Prefix" },
        { key: "suffix", header: "Suffix" },
        { key: "next", header: "Next number", render: (r: any) => String(r.next ?? 1).padStart(6, "0") },
        { key: "reset", header: "Reset", render: (r: any) => <Pill tone="info">{r.reset}</Pill> },
        { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Active" ? "success" : "warn"}>{r.status}</Pill> },
      ]}
      fields={[
        { name: "document", label: "Document type", required: true },
        { name: "prefix", label: "Prefix", placeholder: "INV/26-27/" },
        { name: "suffix", label: "Suffix" },
        { name: "next", label: "Next number", type: "number", default: 1 },
        { name: "reset", label: "Reset cycle", type: "select", default: "Yearly", options: ["Never", "Yearly", "Monthly"].map((v) => ({ label: v, value: v })) },
        { name: "status", label: "Status", type: "select", default: "Active", options: ["Active", "Inactive"].map((v) => ({ label: v, value: v })) },
      ]}
      onCreate={(v) => create(v as any)}
      onUpdate={(id, v) => update(id, v)}
      onDelete={(r) => remove(r.id)}
    />
  );
}
