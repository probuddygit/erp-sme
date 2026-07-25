import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { PlatformAdminLayout } from "@/features/admin-platform/PlatformAdminLayout";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGuard,
});

function AdminGuard() {
  const { isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      navigate({ to: "/workspace" });
    }
  }, [isSuperAdmin, loading, navigate]);

  if (!isSuperAdmin) return null;

  return <PlatformAdminLayout />;
}

