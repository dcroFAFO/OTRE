import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock } from "lucide-react";

export default function BlogPostCard({ post, category }) {
  return (
    <article className="group border-b border-border pb-5">
      <Link to={`/blog/${post.slug}`} className="block overflow-hidden rounded-lg bg-secondary">
        {post.featured_image_url ? (
          <img src={post.featured_image_url} alt={post.featured_image_alt || post.title} className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="aspect-[4/3] w-full bg-secondary" aria-hidden="true" />
        )}
      </Link>
      {category && <Link to={`/blog/category/${category.slug}`} className="mt-3 block text-xs font-bold uppercase tracking-wide text-accent">{category.name}</Link>}
      <Link to={`/blog/${post.slug}`} className="mt-1 block font-heading text-xl font-extrabold leading-tight group-hover:text-accent">{post.title}</Link>
      {post.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{post.published_at ? new Date(post.published_at).toLocaleDateString("en-AU") : "Published"}</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{post.reading_time_minutes || 1} min read</span>
      </div>
    </article>
  );
}