import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { listPublicBlog } from "@/services/blogService";

const STAFF_ROLES = ["admin", "employee", "technician"];

export default function ContentfulSyncButton() {
  const { role } = useCurrentUser();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  if (!STAFF_ROLES.includes(role)) return null;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await listPublicBlog({ action: "sync" });
      queryClient.setQueryData(["publicBlog", "index"], data);
      toast.success(`${data.posts?.length || 0} Contentful articles synced`);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Contentful sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleSync} disabled={syncing}>
      <RefreshCw className={syncing ? "animate-spin" : ""} />
      {syncing ? "Syncing…" : "Sync Contentful"}
    </Button>
  );
}