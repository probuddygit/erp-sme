import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/auth/verify-email")({ component: VerifyPage });

function VerifyPage() {
  return (
    <div className="text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
        <CheckCircle2 className="h-7 w-7 text-primary" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Email verified</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your email has been confirmed. You can now sign in.</p>
      <Link to="/auth/login" className="mt-6 inline-block text-primary hover:underline text-sm">Continue to sign in</Link>
    </div>
  );
}
