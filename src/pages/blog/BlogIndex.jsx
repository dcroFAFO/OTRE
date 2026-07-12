import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import BlogPostCard from "@/components/blog/BlogPostCard";
import ContentfulSyncButton from "@/components/blog/ContentfulSyncButton";
import NewsLeadStories from "@/components/blog/NewsLeadStories";
import NewsBrowseControls from "@/components/blog/NewsBrowseControls";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { listPublicBlog } from "@/services/blogService";

export default function BlogIndex() {
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [tagId, setTagId] = useState("all");
  const [visible, setVisible] = useState(13);
  const { data, isLoading } = useQuery({
    queryKey: ["publicBlog", "index"],
    queryFn: () => listPublicBlog({ action: "index" }),
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
  const posts = data?.posts || [];
  const categories = data?.categories || [];
  const tags = data?.tags || [];
  const perPage = Number(data?.settings?.posts_per_page) || 9;
  const filtered = useMemo(() => posts.filter((post) =>
    (categoryId === "all" || post.category_id === categoryId) &&
    (tagId === "all" || post.tag_ids?.includes(tagId)) &&
    (!q || [post.title, post.excerpt].some((value) => value?.toLowerCase?.().includes(q.toLowerCase())))
  ), [posts, q, categoryId, tagId]);
  const visiblePosts = filtered.slice(0, visible);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="News and Events | On The Run Electrics" description="Browse electric scooter news, local events, repair advice and rider stories from On The Run Electrics in Brisbane." canonical="/blog" />
      <LandingNav />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <header className="border-b border-border pb-10 sm:flex sm:items-end sm:justify-between sm:gap-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">From the workshop</p>
            <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">News &amp; insights</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">Practical advice, local rider news and stories from Brisbane’s electric scooter specialists.</p>
          </div>
          <div className="mt-6 shrink-0 sm:mt-0"><ContentfulSyncButton /></div>
        </header>
        <NewsBrowseControls query={q} onQuery={setQ} categoryId={categoryId} onCategory={setCategoryId} tagId={tagId} onTag={setTagId} categories={categories} tags={tags} />
        {isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading articles…</p>
        ) : visiblePosts.length === 0 ? (
          <div className="border-y border-border py-16 text-center"><h2 className="font-heading text-2xl font-bold">No articles found</h2><p className="mt-2 text-muted-foreground">Try another search, section or topic.</p></div>
        ) : (
          <>
            <NewsLeadStories lead={visiblePosts[0]} secondary={visiblePosts.slice(1, 5)} categories={categories} />
            {visiblePosts.length > 5 && (
              <section className="py-8" aria-labelledby="latest-heading">
                <div className="mb-7 flex items-end justify-between border-b border-border pb-4"><h2 id="latest-heading" className="font-heading text-2xl font-bold sm:text-3xl">Latest articles</h2><span className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:block">News · Events · Advice</span></div>
                <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{visiblePosts.slice(5).map((post) => <BlogPostCard key={post.id} post={post} category={categories.find((category) => category.id === post.category_id)} />)}</div>
              </section>
            )}
            {visible < filtered.length && <div className="border-t border-border pt-7 text-center"><Button variant="outline" onClick={() => setVisible((count) => count + perPage)}>Load more articles</Button></div>}
          </>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}