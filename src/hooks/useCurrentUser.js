import { useAuth } from "@/lib/AuthContext";

// Returns the current authenticated user from the shared auth provider.
export function useCurrentUser() {
  const { user, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  return { user, role: user?.role, isLoading: isLoadingAuth || isLoadingPublicSettings };
}