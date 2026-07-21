import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Cog } from "lucide-react";

export const Route = createFileRoute("/onboarding")({ component: OnboardingLayout });

function OnboardingLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth/login" });
  }, [user, loading, navigate]);
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-4xl px-6 h-14 flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground"><Cog className="h-4 w-4" /></div>
          <span className="font-semibold">Setup wizard</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10"><Outlet /></main>
    </div>
  );
}
