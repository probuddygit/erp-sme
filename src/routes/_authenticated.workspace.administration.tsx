import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/features/admin/AdminLayout";

export const Route = createFileRoute("/_authenticated/workspace/administration")({
  component: AdminLayout,
});