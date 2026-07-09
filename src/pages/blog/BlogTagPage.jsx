import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import BlogPostCard from "@/components/blog/BlogPostCard";
import { listPublicBlog } from "@/services/blogService";

export default function BlogTagPage() {
  const { slug } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["publicBlog", "tag", slug], queryFn: () => listPublicBlog({ action: "tag", slug }) });
  const tag = data?.tag;
  const categories = data?.categories || [];
  const title = `${tag?.name || "Blog Tag"} | OTR Scooters Blog`;
  const description = tag?.description || `Explore OTR Scooters posts tagged ${tag?.name || "electric scooter repair"}, with practical servicing, maintenance and rider safety advice.`;
  return <main className="mx-auto max-w-6xl px-4 py-12"><SEO title={title} description={description} canonical={`/blog/tag/${slug}`} noindex={!isLoading && !tag} /><Link to="/blog" className="text-sm font-semibold text-accent">← Blog</Link><h1 className="mt-4 font-heading text-4xl font-extrabold">#{tag?.name || "Tag"}</h1>{tag?.description && <p className="mt-2 text-muted-foreground">{tag.description}</p>}{isLoading ? <p className="mt-8 text-sm text-muted-foreground">Loading posts…</p> : <div className="mt-8 grid gap-5 md:grid-cols-3">{(data?.posts || []).map((post) => <BlogPostCard key={post.id} post={post} category={categories.find((c) => c.id === post.category_id)} />)}</div>}{!isLoading && (data?.posts || []).length === 0 && <p className="mt-8 text-muted-foreground">No published posts with this tag.</p>}</main>;
}