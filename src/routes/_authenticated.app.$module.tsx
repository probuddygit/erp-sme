import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth, type AppModule } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Truck, Boxes, Factory, Wallet, UserCog, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/$module")({
  component: ModulePage,
});

const META: Record<AppModule, { icon: typeof ShoppingCart; tagline: string; sections: string[] }> = {
  sales: { icon: ShoppingCart, tagline: "Quotes, orders, customers, invoices.", sections: ["Quotes", "Sales orders", "Customers", "Invoices"] },
  procurement: { icon: Truck, tagline: "Suppliers, RFQs, purchase orders.", sections: ["Suppliers", "Purchase orders", "Receiving", "RFQs"] },
  inventory: { icon: Boxes, tagline: "Stock, warehouses, movements.", sections: ["Items", "Stock levels", "Warehouses", "Movements"] },
  production: { icon: Factory, tagline: "BOMs, work orders, routings.", sections: ["Work orders", "BOMs", "Routings", "Shop floor"] },
  finance: { icon: Wallet, tagline: "Ledger, payables, receivables.", sections: ["Ledger", "Payables", "Receivables", "Reports"] },
  hr: { icon: UserCog, tagline: "Employees, attendance, payroll.", sections: ["Employees", "Attendance", "Leave", "Payroll"] },
};

function ModulePage() {
  const { module: mod } = Route.useParams();
  const { canAccessModule, hasModule, company } = useAuth();
  const moduleKey = mod as AppModule;
  const meta = META[moduleKey];
  if (!meta) return <p className="text-muted-foreground">Unknown module.</p>;
  if (!hasModule(moduleKey)) {
    return (
      <Empty title={`${cap(mod)} is disabled`} text={`This module isn't enabled for ${company?.name ?? "your company"}.`}>
        <Button asChild><Link to="/app">Back to dashboard</Link></Button>
      </Empty>
    );
  }
  if (!canAccessModule(moduleKey)) return <Empty title="Access denied" text="Your role doesn't include this module." />;
  const Icon = meta.icon;
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-md flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
          <Icon className="h-6 w-6 text-accent-foreground" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Module</div>
          <h1 className="text-3xl font-bold tracking-tight capitalize">{mod}</h1>
          <p className="text-sm text-muted-foreground mt-1">{meta.tagline}</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {meta.sections.map((s) => (
          <Card key={s} className="hover:border-accent transition-colors">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Section</div>
              <div className="mt-1 font-semibold">{s}</div>
              <div className="mt-3 text-xs text-muted-foreground">Coming soon</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Empty({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-md">
      <div className="h-12 w-12 rounded-md flex items-center justify-center bg-muted">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }