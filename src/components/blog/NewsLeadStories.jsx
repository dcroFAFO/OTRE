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
    <section aria-label="Top stories" className="border-b border-border pb-10">
      <article className="grid overflow-hidden rounded-2xl bg-card shadow-soft lg:grid-cols-[1.35fr_1fr]">
        <Link to={`/blog/${lead.slug}`} className="group block overflow-hidden"><StoryImage post={lead} className="aspect-[16/10] h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /></Link>
        <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Featured {categoryFor(lead)?.name && `· ${categoryFor(lead).name}`}</p>
          <Link to={`/blog/${lead.slug}`} className="group"><h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight group-hover:text-primary sm:text-4xl">{lead.title}</h2></Link>
          {lead.excerpt && <p className="mt-4 text-base leading-7 text-muted-foreground">{lead.excerpt}</p>}
          <Link to={`/blog/${lead.slug}`} className="mt-6 text-sm font-semibold text-primary">Read article →</Link>
        </div>
      </article>
      <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
        {secondary.map((post) => (
          <article key={post.id}>
            <Link to={`/blog/${post.slug}`} className="group block overflow-hidden rounded-xl"><StoryImage post={post} className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /></Link>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-primary">{categoryFor(post)?.name || "Latest"}</p>
            <Link to={`/blog/${post.slug}`} className="mt-2 block font-heading text-lg font-bold leading-snug hover:text-primary">{post.title}</Link>
          </article>
        ))}
      </div>
    </section>
  );
}