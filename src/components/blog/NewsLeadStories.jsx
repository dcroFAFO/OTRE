import React from "react";
import { Link } from "react-router-dom";
import { Newspaper } from "lucide-react";

const StoryImage = ({ post, className }) => post.featured_image_url ? (
  <img src={post.featured_image_url} alt={post.featured_image_alt || post.title} className={className} />
) : (
  <div className={`${className} grid place-items-center bg-secondary text-muted-foreground`}><Newspaper className="h-8 w-8" /></div>
);

export default function NewsLeadStories({ lead, secondary = [], categories = [] }) {
  if (!lead) return null;
  const categoryFor = (post) => categories.find((item) => item.id === post.category_id);

  return (
    <section aria-label="Top stories" className="grid gap-6 border-b-4 border-foreground py-7 lg:grid-cols-[1.55fr_0.85fr]">
      <article className="border-b border-border pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
        <Link to={`/blog/${lead.slug}`} className="group block">
          <StoryImage post={lead} className="aspect-[16/9] w-full rounded-xl object-cover" />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-accent">Top story {categoryFor(lead)?.name && `· ${categoryFor(lead).name}`}</p>
          <h2 className="mt-2 font-heading text-3xl font-extrabold leading-tight group-hover:text-accent sm:text-4xl">{lead.title}</h2>
          {lead.excerpt && <p className="mt-3 text-base leading-relaxed text-muted-foreground">{lead.excerpt}</p>}
        </Link>
      </article>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
        {secondary.map((post) => (
          <article key={post.id} className="grid grid-cols-[7rem_1fr] gap-4 border-b border-border pb-5 last:border-0 last:pb-0">
            <Link to={`/blog/${post.slug}`}><StoryImage post={post} className="aspect-[4/3] h-full w-full rounded-lg object-cover" /></Link>
            <div><p className="text-xs font-bold uppercase tracking-wide text-accent">{categoryFor(post)?.name || "Latest"}</p><Link to={`/blog/${post.slug}`} className="mt-1 block font-heading text-lg font-extrabold leading-snug hover:text-accent">{post.title}</Link></div>
          </article>
        ))}
      </div>
    </section>
  );
}