import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createFinancialYear } from "@/features/org/financial-year.functions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/financial-year")({ component: FYStep });

function FYStep() {
  const { company, refresh } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const [name, setName] = useState(`FY ${y}-${(y + 1).toString().slice(-2)}`);
  const [start, setStart] = useState(`${y}-04-01`);
  const [end, setEnd] = useState(`${y + 1}-03-31`);
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return toast.error("Create a company first");
    setBusy(true);
    try { await createFinancialYear({ data: { company_id: company.id, name, start_date: start, end_date: end, is_active: true } }); await refresh(); toast.success("Setup complete"); navigate({ to: "/workspace" }); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4 · Financial year</CardTitle>
        <CardDescription>India defaults to Apr 1 – Mar 31. Adjust if needed.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4 max-w-md">
          <div><Label htmlFor="name">Name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="start">Start date</Label><Input id="start" type="date" required value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label htmlFor="end">End date</Label><Input id="end" type="date" required value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Finishing…" : "Finish setup"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
