import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Copy, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BlogAdminHeader from "@/components/blog/BlogAdminHeader";
import BlogStatusBadge from "@/components/blog/BlogStatusBadge";
import { archiveBlogPost, createBlogPost, listBlogAdminData, publishBlogPostNow } from "@/services/blogService";

export default function BlogPosts() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["blogAdmin", "posts"], queryFn: () => listBlogAdminData("posts") });
  const posts = data?.posts || [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["blogAdmin"] });
  const duplicate = useMutation({ mutationFn: (post) => createBlogPost({ ...post, title: `${post.title} Copy`, slug: `${post.slug}-copy-${Date.now().toString().slice(-4)}`, status: "draft", published_at: "", scheduled_at: "" }), onSuccess: refresh });
  const publish = useMutation({ mutationFn: publishBlogPostNow, onSuccess: refresh });
  const archive = useMutation({ mutationFn: archiveBlogPost, onSuccess: refresh });
  const filtered = useMemo(() => posts.filter((p) => (status === "all" || p.status === status) && (!q || [p.title, p.slug, p.excerpt].some((v) => v?.toLowerCase?.().includes(q.toLowerCase())))), [posts, q, status]);
  return (
    <div className="space-y-5">
      <BlogAdminHeader title="Blog Posts" description="Search, edit, duplicate, publish, schedule or archive posts." actionTo="/dashboard/blog/posts/new" actionLabel="Create Post" />
      <div className="flex flex-col gap-3 sm:flex-row"><Input placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)} /><select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? <p className="p-5 text-sm text-muted-foreground">Loading posts…</p> : filtered.map((post) => (
          <div key={post.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-0 lg:flex-row lg:items-center lg:justify-between">
            <div><Link to={`/dashboard/blog/posts/${post.id}`} className="font-semibold hover:text-accent">{post.title}</Link><p className="text-xs text-muted-foreground">/{post.slug}</p></div>
            <div className="flex flex-wrap items-center gap-2"><BlogStatusBadge status={post.status} /><Button size="sm" variant="outline" onClick={() => duplicate.mutate(post)}><Copy className="h-4 w-4" />Duplicate</Button><Button size="sm" variant="outline" onClick={() => publish.mutate(post.id)} disabled={post.status === "published"}><Rocket className="h-4 w-4" />Publish</Button><Button size="sm" variant="outline" onClick={() => archive.mutate(post.id)}><Archive className="h-4 w-4" />Archive</Button></div>
          </div>
        ))}
        {!isLoading && filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No posts match your filters.</p>}
      </div>
    </div>
  );
}