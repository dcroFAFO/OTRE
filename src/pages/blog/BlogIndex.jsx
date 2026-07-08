import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BlogPostCard from "@/components/blog/BlogPostCard";
import { listPublicBlog } from "@/services/blogService";

export default function BlogIndex() {
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [tagId, setTagId] = useState("all");
  const [visible, setVisible] = useState(9);
  const { data, isLoading } = useQuery({ queryKey: ["publicBlog", "index"], queryFn: () => listPublicBlog({ action: "index" }) });
  const settings = data?.settings;
  const posts = data?.posts || [];
  const categories = data?.categories || [];
  const tags = data?.tags || [];
  const perPage = Number(settings?.posts_per_page) || 9;
  const filtered = useMemo(() => posts.filter((p) => (categoryId === "all" || p.category_id === categoryId) && (tagId === "all" || p.tag_ids?.includes(tagId)) && (!q || [p.title, p.excerpt].some((v) => v?.toLowerCase?.().includes(q.toLowerCase())))), [posts, q, categoryId, tagId]);
  const featured = filtered[0];
  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${settings?.blog_name || "Blog"} | OTR Scooters`} description={settings?.blog_description || "Helpful electric scooter repair advice."} canonical="/blog" />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center"><Link to="/" className="text-sm font-semibold text-accent">OTR Scooters</Link><h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight">{settings?.blog_name || "Blog"}</h1><p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{settings?.blog_description || "Helpful repair, maintenance and ownership guides for electric scooter riders."}</p></div>
        <div className="mb-6 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-3"><Input placeholder="Search blog…" value={q} onChange={(e) => setQ(e.target.value)} /><select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="all">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={tagId} onChange={(e) => setTagId(e.target.value)}><option value="all">All tags</option>{tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        {isLoading ? <p className="text-center text-sm text-muted-foreground">Loading posts…</p> : filtered.length === 0 ? <div className="rounded-3xl border border-dashed border-border p-12 text-center"><h2 className="font-heading text-2xl font-bold">No published posts yet</h2><p className="mt-2 text-muted-foreground">Check back soon for new articles.</p></div> : <><Featured post={featured} category={categories.find((c) => c.id === featured.category_id)} /><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.slice(0, visible).map((post) => <BlogPostCard key={post.id} post={post} category={categories.find((c) => c.id === post.category_id)} />)}</div>{visible < filtered.length && <div className="mt-8 text-center"><Button variant="outline" onClick={() => setVisible((v) => v + perPage)}>Load more</Button></div>}</>}
      </main>
    </div>
  );
}
function Featured({ post, category }) { if (!post) return null; return <Link to={`/blog/${post.slug}`} className="grid overflow-hidden rounded-3xl border border-border bg-card shadow-gentle lg:grid-cols-2"><div className="min-h-64 bg-secondary">{post.featured_image_url && <img src={post.featured_image_url} alt={post.featured_image_alt || post.title} className="h-full w-full object-cover" />}</div><div className="p-7"><p className="text-xs font-semibold uppercase tracking-wide text-accent">Latest {category?.name ? `· ${category.name}` : ""}</p><h2 className="mt-3 font-heading text-3xl font-extrabold">{post.title}</h2><p className="mt-3 text-muted-foreground">{post.excerpt}</p></div></Link>; }