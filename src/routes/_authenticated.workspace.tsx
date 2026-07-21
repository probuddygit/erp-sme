import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/shared/layout/AppLayout";

export const Route = createFileRoute("/_authenticated/workspace")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { user, loading, company, organization, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth/login" }); return; }
    // Onboarding gates
    if (!organization && roles.includes("owner")) { navigate({ to: "/onboarding/organization" }); return; }
    if (!company && (roles.includes("owner") || roles.includes("admin"))) { navigate({ to: "/onboarding/company" }); return; }
  }, [user, loading, organization, company, roles, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading workspace…</div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}