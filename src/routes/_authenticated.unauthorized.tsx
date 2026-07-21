import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/unauthorized")({ component: UnauthorizedPage });

function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don't have permission to view this resource. Contact your administrator if you believe this is a mistake.</p>
        <Link to="/workspace" className="mt-6 inline-block text-primary hover:underline text-sm">Back to workspace</Link>
      </div>
    </div>
  );
}
