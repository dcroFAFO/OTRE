import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isStaff } from "@/config/permissions";

// After login (including OAuth), the platform returns the user to the app root
// (the Landing page). Signed-in customers should land in their portal instead.
// Staff and anonymous visitors keep seeing the landing page.
export function useCustomerPortalRedirect() {
  const { user, isLoading } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !user) return;
    if (!isStaff(user.role)) {
      navigate("/portal", { replace: true });
    }
  }, [user, isLoading, navigate]);
}