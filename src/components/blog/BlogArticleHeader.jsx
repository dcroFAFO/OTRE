import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BlogArticleHeader({ post, category }) {
  const published = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : "Published";

  return (
    <header className="mx-auto max-w-4xl pb-10 pt-2 text-center sm:pb-14 sm:pt-6">
      <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> News and Events
      </Link>
      {category && <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-primary">{category.name}</p>}
      <h1 className="mt-4 font-heading text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{post.title}</h1>
      {post.excerpt && <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">{post.excerpt}</p>}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>{published}</span><span aria-hidden="true">·</span>
        <span>{post.reading_time_minutes || 1} min read</span>
        {post.author_name && <><span aria-hidden="true">·</span><span>By {post.author_name}</span></>}
      </div>
    </header>
  );
}