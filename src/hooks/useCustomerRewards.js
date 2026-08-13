import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useCustomerRewards(userId, enabled = true) {
  return useQuery({
    queryKey: ["customerRewards", userId],
    queryFn: async () => {
      const response = await base44.functions.invoke("customerRewards", { action: "list" });
      if (response.data?.error) throw Object.assign(new Error(response.data.error), { response });
      return response.data;
    },
    enabled: enabled && !!userId,
  });
}
