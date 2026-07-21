import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createBranch } from "@/features/org/branch.functions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/branch")({ component: BranchStep });

function BranchStep() {
  const { company, refresh } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("Head Office");
  const [code, setCode] = useState("HO");
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return toast.error("Create a company first");
    setBusy(true);
    try { await createBranch({ data: { company_id: company.id, name: name.trim(), code: code.trim(), is_head_office: true } }); await refresh(); toast.success("Branch created"); navigate({ to: "/onboarding/financial-year" }); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3 · Head office branch</CardTitle>
        <CardDescription>You can add more branches later from Administration.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4 max-w-md">
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="name">Name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label htmlFor="code">Code</Label><Input id="code" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={10} /></div>
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Continue"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
