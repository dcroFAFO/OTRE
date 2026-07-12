import React from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import BlogPostCard from "@/components/blog/BlogPostCard";
import BlogArticleHeader from "@/components/blog/BlogArticleHeader";
import BlogShareBar from "@/components/blog/BlogShareBar";
import BlogComments from "@/components/blog/BlogComments";
import NewsPageShell from "@/components/blog/NewsPageShell";
import { listPublicBlog } from "@/services/blogService";

export default function BlogPostPage() {
  const { slug } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["publicBlog", "post", slug],
    queryFn: () => listPublicBlog({ action: "post", slug }),
  });
  const post = data?.post;
  const categories = data?.categories || [];
  const tags = data?.tags || [];
  const category = categories.find((c) => c.id === post?.category_id);

  if (isLoading) {
    return (
      <Page>
        <p className="text-center text-sm text-muted-foreground">Loading post…</p>
      </Page>
    );
  }

  if (!post) {
    return (
      <Page>
        <SEO title="Article not found | On The Run Electrics" noindex />
        <div className="rounded-3xl border border-border bg-card p-12 text-center">
          <h1 className="font-heading text-3xl font-bold">Article not found</h1>
          <Link className="mt-4 inline-block text-accent" to="/blog">Back to blog</Link>
        </div>
      </Page>
    );
  }

  const postUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <Page>
      <SEO
        title={post.meta_title || `${post.title} | On The Run Electrics`}
        description={post.meta_description || post.excerpt}
        canonical={post.canonical_url || `/blog/${post.slug}`}
        ogType="article"
        ogImage={post.featured_image_url}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.published_at,
          author: { "@type": "Person", name: post.author_name || "On The Run Electrics" },
        }}
      />
      <article>
        <BlogArticleHeader post={post} category={category} />
        {post.featured_image_url && (
          <img src={post.featured_image_url} alt={post.featured_image_alt || post.title} className="aspect-[16/9] w-full rounded-2xl object-cover shadow-soft" />
        )}
        <div className="mx-auto max-w-3xl">
          <div className="mt-10 text-[1.05rem] leading-8 text-foreground/85 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_blockquote]:my-8 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-6 [&_blockquote]:italic [&_h2]:mb-4 [&_h2]:mt-12 [&_h2]:font-heading [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h3]:mb-3 [&_h3]:mt-9 [&_h3]:font-heading [&_h3]:text-2xl [&_h3]:font-bold [&_img]:my-8 [&_img]:rounded-xl [&_li]:my-2 [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-6 [&_strong]:text-foreground [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6">
            <ReactMarkdown>{post.content_markdown}</ReactMarkdown>
          </div>
          {data?.settings?.show_author_box && <Author post={post} />}
          {tags.filter((tag) => post.tag_ids?.includes(tag.id)).length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-8">
              {tags.filter((tag) => post.tag_ids?.includes(tag.id)).map((tag) => <Link key={tag.id} to={`/blog/tag/${tag.slug}`} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">#{tag.name}</Link>)}
            </div>
          )}
          <BlogShareBar title={post.title} url={postUrl} />
          <BlogComments postId={post.id} postSlug={post.slug} />
        </div>
      </article>

      {data?.settings?.show_related_posts && data?.related?.length > 0 && (
        <section className="mx-auto mt-12 max-w-5xl">
          <h2 className="font-heading text-2xl font-bold">Related posts</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {data.related.map((item) => (
              <BlogPostCard
                key={item.id}
                post={item}
                category={categories.find((c) => c.id === item.category_id)}
              />
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}

function Page({ children }) {
  return <NewsPageShell>{children}</NewsPageShell>;
}

function Author({ post }) {
  return (
    <div className="mt-12 flex gap-4 border-y border-border py-7">
      {post.author_avatar_url && (
        <img
          src={post.author_avatar_url}
          alt={post.author_name || "Article author"}
          className="h-14 w-14 rounded-full object-cover"
        />
      )}
      <div>
        <p className="font-semibold">{post.author_name || "OTR Scooters"}</p>
        {post.author_bio && <p className="text-sm text-muted-foreground">{post.author_bio}</p>}
      </div>
    </div>
  );
}