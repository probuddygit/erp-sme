import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createOrganization } from "@/features/org/organization.functions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/organization")({ component: OrgStep });

function OrgStep() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await createOrganization({ data: { name: name.trim() } }); await refresh(); toast.success("Organization created"); navigate({ to: "/onboarding/company" }); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1 · Organization</CardTitle>
        <CardDescription>Your workspace's parent entity. You can add multiple companies inside it.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4 max-w-md">
          <div><Label htmlFor="name">Organization name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Continue"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
