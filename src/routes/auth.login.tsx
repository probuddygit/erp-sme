import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, loading, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: isSuperAdmin ? "/admin" : "/workspace" });
  }, [user, loading, isSuperAdmin, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) return toast.error(error);
    toast.success("Signed in");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back. Sign in to your workspace.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
          </div>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground text-center">
        New here? <Link to="/auth/register" className="text-primary hover:underline">Create an organization</Link>
      </p>
    </div>
  );
}
