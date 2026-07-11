import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import BlogPostCard from "@/components/blog/BlogPostCard";
import NewsPageShell from "@/components/blog/NewsPageShell";
import { listPublicBlog } from "@/services/blogService";

export default function BlogTagPage() {
  const { slug } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["publicBlog", "tag", slug], queryFn: () => listPublicBlog({ action: "tag", slug }) });
  const tag = data?.tag;
  const categories = data?.categories || [];
  const title = `${tag?.name || "News Topic"} | On The Run Electrics`;
  const description = tag?.description || `Explore On The Run Electrics articles about ${tag?.name || "electric scooter repair"}, servicing, maintenance and rider safety.`;
  return <NewsPageShell><SEO title={title} description={description} canonical={`/blog/tag/${slug}`} noindex={!isLoading && !tag} /><Link to="/blog" className="text-sm font-semibold text-accent">← News and Events</Link><h1 className="mt-4 border-b-4 border-foreground pb-4 font-heading text-4xl font-extrabold">#{tag?.name || "Topic"}</h1>{tag?.description && <p className="mt-3 text-muted-foreground">{tag.description}</p>}{isLoading ? <p className="mt-8 text-sm text-muted-foreground">Loading articles…</p> : <div className="mt-8 grid gap-6 md:grid-cols-3">{(data?.posts || []).map((post) => <BlogPostCard key={post.id} post={post} category={categories.find((c) => c.id === post.category_id)} />)}</div>}{!isLoading && (data?.posts || []).length === 0 && <p className="mt-8 text-muted-foreground">No published articles with this topic.</p>}</NewsPageShell>;
}