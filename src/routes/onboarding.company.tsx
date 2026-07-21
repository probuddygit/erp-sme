import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createCompany } from "@/features/org/company.functions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/company")({ component: CompanyStep });

function CompanyStep() {
  const { organization, refresh } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return toast.error("Create an organization first");
    setBusy(true);
    try { await createCompany({ data: { organization_id: organization.id, name: name.trim(), gstin: gstin.trim() || undefined, state: state.trim() || undefined } }); await refresh(); toast.success("Company created"); navigate({ to: "/onboarding/branch" }); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2 · Company</CardTitle>
        <CardDescription>Legal entity that transacts. Add GSTIN if you have one.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4 max-w-md">
          <div><Label htmlFor="name">Company name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="gstin">GSTIN</Label><Input id="gstin" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} maxLength={15} /></div>
            <div><Label htmlFor="state">State</Label><Input id="state" value={state} onChange={(e) => setState(e.target.value)} /></div>
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Continue"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
