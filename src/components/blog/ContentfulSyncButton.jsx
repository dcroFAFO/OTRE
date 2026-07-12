import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { listPublicBlog } from "@/services/blogService";

const STAFF_ROLES = ["admin", "employee", "technician"];

export default function ContentfulSyncButton({ onSynced }) {
  const { role } = useCurrentUser();
  const [syncing, setSyncing] = useState(false);

  if (!STAFF_ROLES.includes(role)) return null;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await listPublicBlog({ action: "sync" });
      onSynced(data);
      toast.success("Contentful blog content synced");
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