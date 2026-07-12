import React from "react";
import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

// Capability / role gate for admin areas.
// Pass EITHER `capability` (a key from CAPABILITIES) OR `minRole` (e.g. "admin").
// Renders children when allowed, a loading spinner while resolving, and a clean
// access-denied card otherwise.
export default function RequireCapability({
  capability = undefined,
  minRole = undefined,
  children,
  deniedTitle = "Access restricted",
  deniedMessage = "You don't have permission to view this area.",
  backTo = "/dashboard",
  backLabel = "Back to dashboard",
}) {
  const { isLoading, can, atLeast } = usePermissions();

  if (isLoading) {
    return (
      <div className="fixed inset-0 grid place-items-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  const allowed = capability ? can(capability) : minRole ? atLeast(minRole) : false;

  if (!allowed) {
    return (
      <div className="min-h-screen grid place-items-center bg-secondary/30 px-5">
        <div className="rounded-3xl border border-border bg-card p-10 text-center max-w-md">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-rose-50">
            <ShieldOff className="h-6 w-6 text-rose-500" />
          </div>
          <h1 className="font-heading text-2xl font-extrabold">{deniedTitle}</h1>
          <p className="mt-2 text-muted-foreground">{deniedMessage}</p>
          <Link
            to={backTo}
            className="mt-5 inline-block rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-foreground"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
