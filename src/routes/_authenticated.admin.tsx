import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGuard,
});

function AdminGuard() {
  const { isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !isSuperAdmin) navigate({ to: "/app" });
  }, [isSuperAdmin, loading, navigate]);
  if (!isSuperAdmin) return null;
  return <Outlet />;
}