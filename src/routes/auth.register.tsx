import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createOrganization } from "@/features/org/organization.functions";

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/verify-email`, data: { full_name: fullName } },
      });
      if (error) throw new Error(error.message);
      if (!data.session) {
        toast.success("Check your email to verify your account. You can sign in once verified.");
        navigate({ to: "/auth/login" });
        return;
      }
      await createOrganization({ data: { name: orgName.trim() } });
      toast.success("Organization created");
      navigate({ to: "/onboarding/company" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Create your organization</h1>
      <p className="mt-1 text-sm text-muted-foreground">Start a workspace on Ind Guru ERP.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="fullName">Your name</Label>
            <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="orgName">Organization</Label>
            <Input id="orgName" required value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="mt-1 text-xs text-muted-foreground">Minimum 8 characters.</p>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create organization"}</Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground text-center">
        Already have an account? <Link to="/auth/login" className="text-primary hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
