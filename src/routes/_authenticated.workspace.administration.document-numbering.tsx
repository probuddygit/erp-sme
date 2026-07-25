import { createFileRoute } from "@tanstack/react-router";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/document-numbering")({
  component: () => (
    <DataListPage
      actionLabel="New series"
      searchKeys={["document", "prefix"]}
      columns={[
        { key: "document", header: "Document" },
        { key: "prefix", header: "Prefix" },
        { key: "suffix", header: "Suffix" },
        { key: "next", header: "Next number" },
        { key: "reset", header: "Reset", render: (r: any) => <Pill tone="info">{r.reset}</Pill> },
        { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Active" ? "success" : "warn"}>{r.status}</Pill> },
      ]}
      rows={[
        { id: "1", document: "Sales Invoice", prefix: "INV/26-27/", suffix: "", next: "000241", reset: "Yearly", status: "Active" },
        { id: "2", document: "Sales Order", prefix: "SO/26-27/", suffix: "", next: "000512", reset: "Yearly", status: "Active" },
        { id: "3", document: "Quotation", prefix: "QT/26-27/", suffix: "", next: "000188", reset: "Yearly", status: "Active" },
        { id: "4", document: "Delivery Note", prefix: "DN/26-27/", suffix: "", next: "000144", reset: "Yearly", status: "Active" },
        { id: "5", document: "Purchase Order", prefix: "PO/26-27/", suffix: "", next: "000306", reset: "Yearly", status: "Active" },
        { id: "6", document: "GRN", prefix: "GRN/26-27/", suffix: "", next: "000278", reset: "Yearly", status: "Active" },
        { id: "7", document: "Payment Voucher", prefix: "PV/", suffix: "/26-27", next: "000091", reset: "Yearly", status: "Active" },
        { id: "8", document: "Receipt Voucher", prefix: "RV/", suffix: "/26-27", next: "000162", reset: "Yearly", status: "Active" },
        { id: "9", document: "Credit Note", prefix: "CN/26-27/", suffix: "", next: "000022", reset: "Yearly", status: "Active" },
        { id: "10", document: "Debit Note", prefix: "DR/26-27/", suffix: "", next: "000009", reset: "Yearly", status: "Active" },
        { id: "11", document: "Journal", prefix: "JV/26-27/", suffix: "", next: "000403", reset: "Yearly", status: "Active" },
      ] as any}
    />
  ),
});