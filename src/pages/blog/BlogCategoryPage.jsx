import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import BlogPostCard from "@/components/blog/BlogPostCard";
import NewsPageShell from "@/components/blog/NewsPageShell";
import { listPublicBlog } from "@/services/blogService";

export default function BlogCategoryPage() {
  const { slug } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["publicBlog", "category", slug], queryFn: () => listPublicBlog({ action: "category", slug }) });
  const category = data?.category;
  const title = `${category?.name || "News Category"} | On The Run Electrics`;
  const description = category?.description || `Read On The Run Electrics news and articles about ${category?.name?.toLowerCase?.() || "electric scooter repairs"}, servicing and safer riding.`;
  return <NewsPageShell><SEO title={title} description={description} canonical={`/blog/category/${slug}`} noindex={!isLoading && !category} /><Link to="/blog" className="text-sm font-semibold text-accent">← News and Events</Link><h1 className="mt-4 border-b-4 border-foreground pb-4 font-heading text-4xl font-extrabold">{category?.name || "Category"}</h1>{category?.description && <p className="mt-3 text-muted-foreground">{category.description}</p>}{isLoading ? <p className="mt-8 text-sm text-muted-foreground">Loading articles…</p> : <div className="mt-8 grid gap-6 md:grid-cols-3">{(data?.posts || []).map((post) => <BlogPostCard key={post.id} post={post} category={category} />)}</div>}{!isLoading && (data?.posts || []).length === 0 && <p className="mt-8 text-muted-foreground">No published articles in this section.</p>}</NewsPageShell>;
}