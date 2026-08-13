import React from "react";
import { usePermissions } from "@/hooks/usePermissions";
import PageLoader from "@/components/shared/PageLoader";
import UnauthorizedState from "@/components/shared/UnauthorizedState";

// Capability / role gate for admin areas.
// Pass EITHER `capability` (a key from CAPABILITIES) OR `minRole` (e.g. "admin").
// Renders children when allowed, a loading spinner while resolving, and a clean
// access-denied card otherwise.
/** @param {{ capability?: string, minRole?: string, children: React.ReactNode, deniedTitle?: string, deniedMessage?: string, backTo?: string, backLabel?: string }} props */
export default function RequireCapability({
  capability,
  minRole,
  children,
  deniedTitle = "Access restricted",
  deniedMessage = "You don't have permission to view this area.",
  backTo = "/dashboard",
  backLabel = "Back to dashboard",
}) {
  const { isLoading, can, atLeast } = usePermissions();

  if (isLoading) {
    return <PageLoader label="Checking permissions" />;
  }

  const allowed = capability ? can(capability) : minRole ? atLeast(minRole) : false;

  if (!allowed) {
    return (
      <UnauthorizedState
        title={deniedTitle}
        description={deniedMessage}
        actionTo={backTo}
        actionLabel={backLabel}
      />
    );
  }

  return <>{children}</>;
}
