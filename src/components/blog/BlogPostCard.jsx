import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock } from "lucide-react";

export default function BlogPostCard({ post, category }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-gentle hover:-translate-y-0.5 hover:shadow-gentle">
      {post.featured_image_url && <img src={post.featured_image_url} alt={post.featured_image_alt || post.title} className="h-48 w-full object-cover" />}
      <div className="p-5 space-y-3">
        {category && <Link to={`/blog/category/${category.slug}`} className="text-xs font-semibold text-accent">{category.name}</Link>}
        <Link to={`/blog/${post.slug}`} className="block font-heading text-xl font-extrabold leading-tight hover:text-accent">{post.title}</Link>
        {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{post.published_at ? new Date(post.published_at).toLocaleDateString() : "Published"}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{post.reading_time_minutes || 1} min read</span>
        </div>
      </div>
    </article>
  );
}