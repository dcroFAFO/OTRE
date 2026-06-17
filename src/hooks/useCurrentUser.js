import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isStaff } from "@/config/permissions";

// Resolve the effective app role. Historically the role has been stored in a
// few different places (top-level `role`, `data.role`, `data._app_role`).
// Prefer whichever one resolves to a staff role so the dashboard gate and
// permission checks stay correct regardless of where the role was written.
function resolveRole(u) {
  if (!u) return null;
  const candidates = [u.role, u.data?.role, u.data?._app_role].filter(Boolean);
  return candidates.find(isStaff) || candidates[0] || null;
}

// Returns the current authenticated user (with resolved role) or null.
export function useCurrentUser() {
  const { data, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  // Normalise the role onto the user object so every consumer (dashboard gate,
  // permission checks, panels) sees the same effective role.
  const role = resolveRole(data);
  const user = data ? { ...data, role } : null;

  return { user, role, isLoading };
}