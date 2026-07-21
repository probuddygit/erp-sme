import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forgot-password")({ component: ForgotPage });

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Forgot password</h1>
      <p className="mt-1 text-sm text-muted-foreground">We'll email you a reset link.</p>
      {sent ? (
        <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
          If an account exists for <b>{email}</b>, a reset link is on its way.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
      <p className="mt-6 text-sm text-muted-foreground text-center">
        <Link to="/auth/login" className="text-primary hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}
