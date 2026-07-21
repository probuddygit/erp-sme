import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Cog } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex flex-col justify-between p-10 text-primary-foreground" style={{ background: "linear-gradient(135deg, hsl(220 90% 40%), hsl(220 90% 25%))" }}>
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
          <div className="h-9 w-9 rounded-md bg-white/10 flex items-center justify-center"><Cog className="h-5 w-5" /></div>
          Ind Guru ERP
        </Link>
        <div>
          <div className="text-4xl font-bold leading-tight">AI-native ERP for Indian MSMEs</div>
          <p className="mt-3 text-sm opacity-80 max-w-md">Multi-company, multi-branch, GST-ready. Sales, procurement, inventory, finance — one place.</p>
        </div>
        <div className="text-xs opacity-70">© {new Date().getFullYear()} Ind Guru ERP</div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md"><Outlet /></div>
      </div>
    </div>
  );
}
