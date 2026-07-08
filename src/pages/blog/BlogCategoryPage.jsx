import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import BlogPostCard from "@/components/blog/BlogPostCard";
import { listPublicBlog } from "@/services/blogService";

export default function BlogCategoryPage() {
  const { slug } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["publicBlog", "category", slug], queryFn: () => listPublicBlog({ action: "category", slug }) });
  const category = data?.category;
  return <main className="mx-auto max-w-6xl px-4 py-12"><SEO title={`${category?.name || "Category"} | OTR Scooters Blog`} canonical={`/blog/category/${slug}`} /><Link to="/blog" className="text-sm font-semibold text-accent">← Blog</Link><h1 className="mt-4 font-heading text-4xl font-extrabold">{category?.name || "Category"}</h1>{category?.description && <p className="mt-2 text-muted-foreground">{category.description}</p>}{isLoading ? <p className="mt-8 text-sm text-muted-foreground">Loading posts…</p> : <div className="mt-8 grid gap-5 md:grid-cols-3">{(data?.posts || []).map((post) => <BlogPostCard key={post.id} post={post} category={category} />)}</div>}{!isLoading && (data?.posts || []).length === 0 && <p className="mt-8 text-muted-foreground">No published posts in this category.</p>}</main>;
}