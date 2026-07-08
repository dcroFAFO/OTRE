import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BlogAdminHeader from "@/components/blog/BlogAdminHeader";
import { createBlogPost, emptyPost, listBlogAdminData, publishBlogPostNow, readingTime, scheduleBlogPost, slugify, updateBlogPost, cancelScheduledBlogPost } from "@/services/blogService";
import { useDashboardUser } from "@/components/dashboard/DashboardLayout";

export default function BlogEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const user = useDashboardUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["blogAdmin", "editor"], queryFn: () => listBlogAdminData("editor") });
  const [post, setPost] = useState(null);
  useEffect(() => { if (data) setPost(isNew ? emptyPost(user, data.settings) : data.posts.find((p) => p.id === id)); }, [data, id, isNew, user]);
  const saveMutation = useMutation({ mutationFn: async () => isNew ? createBlogPost(post) : updateBlogPost(id, post), onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["blogAdmin"] }); if (isNew) navigate(`/dashboard/blog/posts/${res.post.id}`); } });
  const publishMutation = useMutation({ mutationFn: async () => { const saved = isNew ? await createBlogPost(post) : await updateBlogPost(id, post); return publishBlogPostNow(saved.post.id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["blogAdmin"] }) });
  const scheduleMutation = useMutation({ mutationFn: async () => { const saved = isNew ? await createBlogPost(post) : await updateBlogPost(id, post); return scheduleBlogPost(saved.post.id, post.scheduled_at); }, onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["blogAdmin"] }); if (isNew) navigate(`/dashboard/blog/posts/${res.post.id}`); } });
  const cancelMutation = useMutation({ mutationFn: () => cancelScheduledBlogPost(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["blogAdmin"] }) });
  const words = useMemo(() => String(post?.content_markdown || "").trim().split(/\s+/).filter(Boolean).length, [post]);
  if (!post) return <p className="text-sm text-muted-foreground">Loading editor…</p>;
  const set = (key, value) => setPost((p) => ({ ...p, [key]: value }));
  const checklist = { "Title exists": post.title, "Slug exists": post.slug, "Meta title exists": post.meta_title, "Meta description exists": post.meta_description, "Content exists": post.content_markdown, "Featured image alt text exists": post.featured_image_alt, "Target keyword exists": post.target_keyword };
  return (
    <div className="space-y-5">
      <BlogAdminHeader title={isNew ? "Create Blog Post" : "Edit Blog Post"} description="Save drafts, preview SEO, publish now or schedule for later." />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card><CardContent className="space-y-4 p-5">
          <Field label="Title"><Input value={post.title || ""} onChange={(e) => setPost((p) => ({ ...p, title: e.target.value, slug: p.slug || slugify(e.target.value), meta_title: p.meta_title || e.target.value }))} /></Field>
          <Field label="Slug"><Input value={post.slug || ""} onChange={(e) => set("slug", slugify(e.target.value))} /></Field>
          <Field label="Excerpt"><Textarea value={post.excerpt || ""} onChange={(e) => set("excerpt", e.target.value)} /></Field>
          <Field label="Content editor"><Textarea className="min-h-[360px] font-mono" value={post.content_markdown || ""} onChange={(e) => set("content_markdown", e.target.value)} placeholder="Write Markdown content…" /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Category"><select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={post.category_id || ""} onChange={(e) => set("category_id", e.target.value)}><option value="">None</option>{data?.categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Tags"><select multiple className="h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={post.tag_ids || []} onChange={(e) => set("tag_ids", Array.from(e.target.selectedOptions).map((o) => o.value))}>{data?.tags?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Featured image URL"><Input value={post.featured_image_url || ""} onChange={(e) => set("featured_image_url", e.target.value)} /></Field><Field label="Featured image alt text"><Input value={post.featured_image_alt || ""} onChange={(e) => set("featured_image_alt", e.target.value)} /></Field></div>
        </CardContent></Card>
        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Publish controls</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{words} words · {readingTime(post.content_markdown)} min read</p><select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={post.status || "draft"} onChange={(e) => set("status", e.target.value)}><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="archived">Archived</option></select><Input type="datetime-local" value={post.scheduled_at?.slice(0, 16) || ""} onChange={(e) => set("scheduled_at", e.target.value ? new Date(e.target.value).toISOString() : "")} /><div className="flex flex-wrap gap-2"><Button onClick={() => saveMutation.mutate()}>Save draft</Button><Button variant="outline" onClick={() => publishMutation.mutate()}>Publish now</Button><Button variant="outline" onClick={() => scheduleMutation.mutate()}>Schedule</Button>{!isNew && post.status === "scheduled" && <Button variant="ghost" onClick={() => cancelMutation.mutate()}>Cancel schedule</Button>}</div></CardContent></Card>
          <SeoPanel post={post} set={set} checklist={checklist} />
          <Card><CardHeader><CardTitle>Preview</CardTitle></CardHeader><CardContent className="prose prose-sm max-w-none"><ReactMarkdown>{post.content_markdown || "Nothing to preview yet."}</ReactMarkdown></CardContent></Card>
          <Button variant="ghost" asChild><Link to="/dashboard/blog/posts">Back to posts</Link></Button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, children }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function SeoPanel({ post, set, checklist }) { return <Card><CardHeader><CardTitle>SEO</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="Target keyword"><Input value={post.target_keyword || ""} onChange={(e) => set("target_keyword", e.target.value)} /></Field><Field label="Meta title"><Input value={post.meta_title || ""} onChange={(e) => set("meta_title", e.target.value)} /></Field><Field label="Meta description"><Textarea value={post.meta_description || ""} onChange={(e) => set("meta_description", e.target.value)} /></Field><Field label="Canonical URL"><Input value={post.canonical_url || ""} onChange={(e) => set("canonical_url", e.target.value)} /></Field><div className="rounded-xl bg-secondary/60 p-3 text-xs"><p className="font-semibold">SEO checklist</p>{Object.entries(checklist).map(([label, ok]) => <p key={label} className={ok ? "text-emerald-700" : "text-muted-foreground"}>{ok ? "✓" : "○"} {label}</p>)}</div></CardContent></Card>; }