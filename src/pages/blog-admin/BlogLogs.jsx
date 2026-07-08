import React from "react";
import { useQuery } from "@tanstack/react-query";
import BlogAdminHeader from "@/components/blog/BlogAdminHeader";
import { listBlogAdminData } from "@/services/blogService";

export default function BlogLogs() {
  const { data, isLoading } = useQuery({ queryKey: ["blogAdmin", "logs"], queryFn: () => listBlogAdminData("logs") });
  const logs = data?.logs || [];
  return (
    <div className="space-y-5">
      <BlogAdminHeader title="Blog Logs" description="Recent blog activity and publishing events." />
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {isLoading ? <p className="p-5 text-sm text-muted-foreground">Loading logs…</p> : logs.map((log) => (
          <div key={log.id} className="grid gap-1 border-b border-border p-4 last:border-0 sm:grid-cols-[180px_1fr_120px]">
            <span className="text-xs text-muted-foreground">{log.created_at ? new Date(log.created_at).toLocaleString() : ""}</span>
            <div><p className="font-medium">{log.event_type}</p><p className="text-sm text-muted-foreground">{log.message}</p></div>
            <span className="text-xs capitalize text-muted-foreground">{log.status}</span>
          </div>
        ))}
        {!isLoading && logs.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No blog activity yet.</p>}
      </div>
    </div>
  );
}