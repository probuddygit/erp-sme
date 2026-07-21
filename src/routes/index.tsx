import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Cog, Factory, ShieldCheck, Layers, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: isSuperAdmin ? "/admin" : "/workspace" });
    }
  }, [user, loading, isSuperAdmin, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
              <Cog className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="font-bold tracking-tight">Ind Guru ERP</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/login">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32 text-primary-foreground">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Multi-tenant ERP
          </div>
          <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight max-w-3xl leading-[1.05]">
            The factory floor,<br />
            <span className="text-accent">built into software.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-primary-foreground/70">
            One platform for sales, procurement, inventory, production, finance and HR — purpose-built for small and medium manufacturers.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/login">
                Enter workspace <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-3 gap-6">
        {[
          { icon: Layers, title: "Modular by design", text: "Toggle Sales, Procurement, Inventory, Production, Finance, HR per company." },
          { icon: ShieldCheck, title: "Tenant isolation", text: "Row-level security keeps every company's data fully separated." },
          { icon: Factory, title: "Made for manufacturing", text: "Workflows shaped around production lines, BOMs, and job tracking." },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border border-border bg-card p-6">
            <f.icon className="h-6 w-6 text-accent" />
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Ind Guru ERP
        </div>
      </footer>
    </div>
  );
}
