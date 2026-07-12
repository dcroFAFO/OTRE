import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function BlogPostCard({ post, category }) {
  return (
    <article className="group">
      <Link to={`/blog/${post.slug}`} className="block overflow-hidden rounded-xl bg-secondary">
        {post.featured_image_url ? (
          <img src={post.featured_image_url} alt={post.featured_image_alt || post.title} className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="aspect-[4/3] w-full bg-secondary" aria-hidden="true" />
        )}
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
        {category && <Link to={`/blog/category/${category.slug}`} className="font-bold uppercase tracking-[0.12em] text-primary">{category.name}</Link>}
        {category && <span aria-hidden="true">·</span>}
        <span>{post.published_at ? new Date(post.published_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "Published"}</span>
      </div>
      <Link to={`/blog/${post.slug}`} className="mt-2 block font-heading text-xl font-bold leading-snug group-hover:text-primary">{post.title}</Link>
      {post.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>}
      <Link to={`/blog/${post.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-foreground group-hover:text-primary">Read article <ArrowUpRight className="h-4 w-4" /></Link>
    </article>
  );
}