import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { acceptInvitation } from "@/features/org/invitation.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Search = { token?: string };

export const Route = createFileRoute("/auth/accept-invite")({
  component: AcceptPage,
  validateSearch: (s: Record<string, unknown>): Search => ({ token: typeof s.token === "string" ? s.token : undefined }),
});

function AcceptPage() {
  const { user, loading, refresh } = useAuth();
  const { token } = useSearch({ from: "/auth/accept-invite" });
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) setMsg("Missing invitation token");
  }, [token]);

  const onAccept = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await acceptInvitation({ data: { token } });
      await refresh();
      setStatus("done");
      toast.success("Invitation accepted");
      navigate({ to: "/workspace" });
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Failed to accept");
    } finally { setBusy(false); }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!user) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accept invitation</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please sign in with the invited email address to continue.</p>
        <Button className="mt-4 w-full" onClick={() => navigate({ to: "/auth/login" })}>Go to sign in</Button>
      </div>
    );
  }
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Accept invitation</h1>
      <p className="mt-2 text-sm text-muted-foreground">You're about to join a workspace with your account.</p>
      {msg && <p className="mt-3 text-sm text-destructive">{msg}</p>}
      {status !== "done" && (
        <Button className="mt-4 w-full" disabled={busy || !token} onClick={onAccept}>
          {busy ? "Accepting…" : "Accept & join"}
        </Button>
      )}
    </div>
  );
}
