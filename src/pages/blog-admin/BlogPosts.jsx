import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Copy, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BlogAdminHeader from "@/components/blog/BlogAdminHeader";
import BlogStatusBadge from "@/components/blog/BlogStatusBadge";
import { ErrorState, TableSkeleton } from "@/components/shared";
import { archiveBlogPost, createBlogPost, listBlogAdminData, publishBlogPostNow } from "@/services/blogService";

export default function BlogPosts() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["blogAdmin", "posts"], queryFn: () => listBlogAdminData("posts") });
  const posts = data?.posts || [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["blogAdmin"] });
  const duplicate = useMutation({ mutationFn: (/** @type {Record<string, any>} */ post) => createBlogPost({ ...post, title: `${post.title} Copy`, slug: `${post.slug}-copy-${Date.now().toString().slice(-4)}`, status: "draft", published_at: "", scheduled_at: "" }), onSuccess: refresh });
  const publish = useMutation({ mutationFn: publishBlogPostNow, onSuccess: refresh });
  const archive = useMutation({ mutationFn: archiveBlogPost, onSuccess: refresh });
  const busy = duplicate.isPending || publish.isPending || archive.isPending;
  const mutationError = duplicate.error || publish.error || archive.error;
  const filtered = useMemo(() => posts.filter((p) => (status === "all" || p.status === status) && (!q || [p.title, p.slug, p.excerpt].some((v) => v?.toLowerCase?.().includes(q.toLowerCase())))), [posts, q, status]);
  return (
    <div className="space-y-5">
      <BlogAdminHeader title="Blog Posts" description="Search, edit, duplicate, publish, schedule or archive posts." actionTo="/dashboard/blog/posts/new" actionLabel="Create Post" />
      <div className="flex flex-col gap-3 sm:flex-row"><div className="flex-1"><Label className="sr-only" htmlFor="blog-post-search">Search posts</Label><Input id="blog-post-search" placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)} /></div><div><Label className="sr-only" htmlFor="blog-post-status">Filter by status</Label><select id="blog-post-status" className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="archived">Archived</option></select></div></div>
      {error && <ErrorState error={error} onRetry={refetch} />}
      {mutationError && <ErrorState title="Blog post action failed" error={mutationError} />}
      {isLoading && <TableSkeleton rows={6} columns={3} label="Loading blog posts" />}
      {!isLoading && !error && (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {filtered.map((post) => (
          <div key={post.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-0 lg:flex-row lg:items-center lg:justify-between">
            <div><Link to={`/dashboard/blog/posts/${post.id}`} className="font-semibold hover:text-accent">{post.title}</Link><p className="text-xs text-muted-foreground">/{post.slug}</p></div>
            <div className="flex flex-wrap items-center gap-2"><BlogStatusBadge status={post.status} /><Button className="min-h-11" size="sm" variant="outline" onClick={() => duplicate.mutate(post)} disabled={busy}><Copy className="h-4 w-4" aria-hidden="true" />Duplicate</Button><Button className="min-h-11" size="sm" variant="outline" onClick={() => publish.mutate(post.id)} disabled={busy || post.status === "published"}><Rocket className="h-4 w-4" aria-hidden="true" />Publish</Button><Button className="min-h-11" size="sm" variant="outline" onClick={() => { if (window.confirm(`Archive “${post.title}”? It will no longer appear on the public blog.`)) archive.mutate(post.id); }} disabled={busy || post.status === "archived"}><Archive className="h-4 w-4" aria-hidden="true" />Archive</Button></div>
          </div>
        ))}
        {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{posts.length === 0 ? "No blog posts yet." : "No posts match your filters."}</p>}
      </div>
      )}
    </div>
  );
}
