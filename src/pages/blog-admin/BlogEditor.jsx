import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BlogAdminHeader from "@/components/blog/BlogAdminHeader";
import BlogStatusBadge from "@/components/blog/BlogStatusBadge";
import { CardSkeleton, ErrorState, FieldShell } from "@/components/shared";
import { createBlogPost, emptyPost, listBlogAdminData, publishBlogPostNow, readingTime, scheduleBlogPost, slugify, updateBlogPost, cancelScheduledBlogPost } from "@/services/blogService";
import { useDashboardUser } from "@/components/dashboard/DashboardLayout";

export default function BlogEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const user = useDashboardUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["blogAdmin", "editor"], queryFn: () => listBlogAdminData("editor") });
  const [post, setPost] = useState(null);
  const loadedPostKey = React.useRef("");
  useEffect(() => {
    if (!data) return;
    const key = isNew ? "new" : String(id || "");
    if (loadedPostKey.current === key) return;
    loadedPostKey.current = key;
    setPost(isNew ? emptyPost(user, data.settings) : data.posts.find((p) => p.id === id));
  }, [data, id, isNew, user]);
  const validationError = (message) => Object.assign(new Error(message), { status: 400, response: { data: { error: message } } });
  const requirePostFields = () => {
    if (!post?.title?.trim()) throw validationError("Add a title before saving this post.");
    if (!post?.slug?.trim()) throw validationError("Add a URL slug before saving this post.");
  };
  const savePost = async () => { requirePostFields(); return isNew ? createBlogPost(post) : updateBlogPost(id, post); };
  const afterSave = (res) => { qc.invalidateQueries({ queryKey: ["blogAdmin"] }); if (isNew) navigate(`/dashboard/blog/posts/${res.post.id}`); else if (res?.post) setPost(res.post); };
  const saveMutation = useMutation({ mutationFn: savePost, onSuccess: afterSave });
  const publishMutation = useMutation({ mutationFn: async () => { const saved = await savePost(); return publishBlogPostNow(saved.post.id); }, onSuccess: afterSave });
  const scheduleMutation = useMutation({ mutationFn: async () => { requirePostFields(); const scheduledAt = new Date(post?.scheduled_at || ""); if (!post?.scheduled_at || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) throw validationError("Choose a future publish date and time before scheduling."); const saved = await savePost(); return scheduleBlogPost(saved.post.id, post.scheduled_at); }, onSuccess: afterSave });
  const cancelMutation = useMutation({ mutationFn: () => cancelScheduledBlogPost(id), onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["blogAdmin"] }); if (res?.post) setPost(res.post); } });
  const words = useMemo(() => String(post?.content_markdown || "").trim().split(/\s+/).filter(Boolean).length, [post]);
  const busy = saveMutation.isPending || publishMutation.isPending || scheduleMutation.isPending || cancelMutation.isPending;
  const mutationError = saveMutation.error || publishMutation.error || scheduleMutation.error || cancelMutation.error;
  if (isLoading) return <div className="space-y-5"><BlogAdminHeader title={isNew ? "Create Blog Post" : "Edit Blog Post"} description="Save drafts, preview SEO, publish now or schedule for later." /><CardSkeleton count={2} /></div>;
  if (error) return <div className="space-y-5"><BlogAdminHeader title={isNew ? "Create Blog Post" : "Edit Blog Post"} description="Save drafts, preview SEO, publish now or schedule for later." /><ErrorState error={error} onRetry={refetch} /></div>;
  if (!isNew && data && !data.posts?.some((item) => item.id === id)) return <div className="space-y-5"><BlogAdminHeader title="Blog post not found" description="This post may have been removed or you may have followed an old link." /><Button variant="outline" asChild><Link to="/dashboard/blog/posts">Back to posts</Link></Button></div>;
  if (!post) return <CardSkeleton count={2} />;
  const set = (key, value) => setPost((p) => ({ ...p, [key]: value }));
  const checklist = { "Title exists": post.title, "Slug exists": post.slug, "Meta title exists": post.meta_title, "Meta description exists": post.meta_description, "Content exists": post.content_markdown, "Featured image alt text exists": post.featured_image_alt, "Target keyword exists": post.target_keyword };
  return (
    <div className="space-y-5">
      <BlogAdminHeader title={isNew ? "Create Blog Post" : "Edit Blog Post"} description="Save drafts, preview SEO, publish now or schedule for later." />
      {mutationError && <ErrorState title="Blog post change failed" error={mutationError} />}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card><CardContent className="space-y-4 p-5">
          <Field label="Title"><Input value={post.title || ""} onChange={(e) => setPost((p) => ({ ...p, title: e.target.value, slug: p.slug || slugify(e.target.value), meta_title: p.meta_title || e.target.value }))} /></Field>
          <Field label="Slug"><Input value={post.slug || ""} onChange={(e) => set("slug", slugify(e.target.value))} /></Field>
          <Field label="Excerpt"><Textarea value={post.excerpt || ""} onChange={(e) => set("excerpt", e.target.value)} /></Field>
          <Field label="Content editor"><Textarea className="min-h-[360px] font-mono" value={post.content_markdown || ""} onChange={(e) => set("content_markdown", e.target.value)} placeholder="Write Markdown content…" /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Category"><select className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={post.category_id || ""} onChange={(e) => set("category_id", e.target.value)}><option value="">None</option>{data?.categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Tags"><select multiple className="h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={post.tag_ids || []} onChange={(e) => set("tag_ids", Array.from(e.target.selectedOptions).map((o) => o.value))}>{data?.tags?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Featured image URL"><Input value={post.featured_image_url || ""} onChange={(e) => set("featured_image_url", e.target.value)} /></Field><Field label="Featured image alt text"><Input value={post.featured_image_alt || ""} onChange={(e) => set("featured_image_alt", e.target.value)} /></Field></div>
        </CardContent></Card>
        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Publish controls</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">{words} words · {readingTime(post.content_markdown)} min read</p><BlogStatusBadge status={post.status || "draft"} /></div><Field label="Scheduled publish time"><Input type="datetime-local" value={post.scheduled_at?.slice(0, 16) || ""} onChange={(e) => set("scheduled_at", e.target.value ? new Date(e.target.value).toISOString() : "")} /></Field><div className="flex flex-wrap gap-2"><Button className="min-h-11" onClick={() => saveMutation.mutate()} disabled={busy}>{saveMutation.isPending ? "Saving…" : "Save changes"}</Button><Button className="min-h-11" variant="outline" onClick={() => { if (window.confirm(`Publish “${post.title || "this post"}” now?`)) publishMutation.mutate(); }} disabled={busy}>{publishMutation.isPending ? "Publishing…" : "Publish now"}</Button><Button className="min-h-11" variant="outline" onClick={() => scheduleMutation.mutate()} disabled={busy}>{scheduleMutation.isPending ? "Scheduling…" : "Schedule"}</Button>{!isNew && post.status === "scheduled" && <Button className="min-h-11" variant="ghost" onClick={() => cancelMutation.mutate()} disabled={busy}>{cancelMutation.isPending ? "Cancelling…" : "Cancel schedule"}</Button>}</div></CardContent></Card>
          <SeoPanel post={post} set={set} checklist={checklist} />
          <Card><CardHeader><CardTitle>Preview</CardTitle></CardHeader><CardContent className="prose prose-sm max-w-none"><ReactMarkdown>{post.content_markdown || "Nothing to preview yet."}</ReactMarkdown></CardContent></Card>
          <Button variant="ghost" asChild><Link to="/dashboard/blog/posts">Back to posts</Link></Button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, children }) { const fieldId = React.useId(); return <FieldShell id={fieldId} label={label}>{children}</FieldShell>; }
function SeoPanel({ post, set, checklist }) { return <Card><CardHeader><CardTitle>SEO</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="Target keyword"><Input value={post.target_keyword || ""} onChange={(e) => set("target_keyword", e.target.value)} /></Field><Field label="Meta title"><Input value={post.meta_title || ""} onChange={(e) => set("meta_title", e.target.value)} /></Field><Field label="Meta description"><Textarea value={post.meta_description || ""} onChange={(e) => set("meta_description", e.target.value)} /></Field><Field label="Canonical URL"><Input value={post.canonical_url || ""} onChange={(e) => set("canonical_url", e.target.value)} /></Field><div className="rounded-xl bg-secondary/60 p-3 text-xs"><p className="font-semibold">SEO checklist</p>{Object.entries(checklist).map(([label, ok]) => <p key={label} className={ok ? "text-emerald-700" : "text-muted-foreground"}>{ok ? "✓" : "○"} {label}</p>)}</div></CardContent></Card>; }
