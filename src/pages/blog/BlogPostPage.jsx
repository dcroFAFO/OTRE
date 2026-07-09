import React from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import BlogPostCard from "@/components/blog/BlogPostCard";
import { listPublicBlog } from "@/services/blogService";

export default function BlogPostPage() {
  const { slug } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["publicBlog", "post", slug], queryFn: () => listPublicBlog({ action: "post", slug }) });
  const post = data?.post;
  const categories = data?.categories || [];
  const tags = data?.tags || [];
  const category = categories.find((c) => c.id === post?.category_id);
  if (isLoading) return <Page><p className="text-center text-sm text-muted-foreground">Loading post…</p></Page>;
  if (!post) return <Page><SEO title="Post not found | OTR Scooters" noindex /><div className="rounded-3xl border border-border bg-card p-12 text-center"><h1 className="font-heading text-3xl font-bold">Post not found</h1><Link className="mt-4 inline-block text-accent" to="/blog">Back to blog</Link></div></Page>;
  return <Page><SEO title={post.meta_title || `${post.title} | OTR Scooters`} description={post.meta_description || post.excerpt} canonical={post.canonical_url || `/blog/${post.slug}`} ogType="article" ogImage={post.featured_image_url} structuredData={{ "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.excerpt, datePublished: post.published_at, author: { "@type": "Person", name: post.author_name || "OTR Scooters" } }} /><article className="mx-auto max-w-3xl"><Link to="/blog" className="text-sm font-semibold text-accent">← Blog</Link><h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight">{post.title}</h1>{post.excerpt && <p className="mt-4 text-xl text-muted-foreground">{post.excerpt}</p>}<div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground"><span>{post.published_at ? new Date(post.published_at).toLocaleDateString() : "Published"}</span><span>·</span><span>{post.reading_time_minutes || 1} min read</span>{category && <><span>·</span><Link to={`/blog/category/${category.slug}`} className="text-accent">{category.name}</Link></>}</div>{post.featured_image_url && <img src={post.featured_image_url} alt={post.featured_image_alt || post.title} className="mt-8 rounded-3xl border border-border" />}<div className="prose prose-slate mt-8 max-w-none"><ReactMarkdown>{post.content_markdown}</ReactMarkdown></div>{data?.settings?.show_author_box && <Author post={post} />}{tags.filter((t) => post.tag_ids?.includes(t.id)).length > 0 && <div className="mt-8 flex flex-wrap gap-2">{tags.filter((t) => post.tag_ids?.includes(t.id)).map((tag) => <Link key={tag.id} to={`/blog/tag/${tag.slug}`} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">#{tag.name}</Link>)}</div>}</article>{data?.settings?.show_related_posts && data?.related?.length > 0 && <section className="mx-auto mt-12 max-w-5xl"><h2 className="font-heading text-2xl font-bold">Related posts</h2><div className="mt-4 grid gap-5 md:grid-cols-3">{data.related.map((item) => <BlogPostCard key={item.id} post={item} category={categories.find((c) => c.id === item.category_id)} />)}</div></section>}</Page>;
}
function Page({ children }) { return <div className="min-h-screen bg-background"><main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">{children}</main></div>; }
function Author({ post }) { return <div className="mt-10 flex gap-4 rounded-3xl border border-border bg-card p-5">{post.author_avatar_url && <img src={post.author_avatar_url} alt={post.author_name || "Article author"} className="h-14 w-14 rounded-full object-cover" />}<div><p className="font-semibold">{post.author_name || "OTR Scooters"}</p>{post.author_bio && <p className="text-sm text-muted-foreground">{post.author_bio}</p>}</div></div>; }