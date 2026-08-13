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
import { getBlogIndexSchema } from "@/lib/structuredData";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { CardSkeleton, EmptyState, ErrorState, NoResultsState } from "@/components/shared";
import { Newspaper } from "lucide-react";
import { Link } from "react-router-dom";

export default function BlogIndex() {
  const { data: { business } } = usePlatformConfig();
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [tagId, setTagId] = useState("all");
  const [visible, setVisible] = useState(13);
  const blogQuery = useQuery({
    queryKey: ["publicBlog", "index"],
    queryFn: () => listPublicBlog({ action: "index" }),
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
  const { data, isLoading, isError, error, refetch } = blogQuery;
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
  const hasFilters = !!q.trim() || categoryId !== "all" || tagId !== "all";
  const clearFilters = () => {
    setQ("");
    setCategoryId("all");
    setTagId("all");
    setVisible(13);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title={`News and Events | ${business.name}`} description={`Browse electric scooter news, local events, repair advice and rider stories from ${business.name}.`} canonical="/blog" structuredData={getBlogIndexSchema(business)} />
      <LandingNav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <header className="border-b border-border pb-10 sm:flex sm:items-end sm:justify-between sm:gap-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase text-primary">From the workshop</p>
            <h1 className="mt-3 font-heading text-4xl font-bold sm:text-5xl lg:text-6xl">News &amp; insights</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">Practical advice, local rider news and stories from Brisbane’s electric scooter specialists.</p>
          </div>
          <div className="mt-6 shrink-0 sm:mt-0"><ContentfulSyncButton /></div>
        </header>
        <NewsBrowseControls query={q} onQuery={(value) => { setQ(value); setVisible(13); }} categoryId={categoryId} onCategory={(value) => { setCategoryId(value); setVisible(13); }} tagId={tagId} onTag={(value) => { setTagId(value); setVisible(13); }} categories={categories} tags={tags} />
        {isLoading ? (
          <CardSkeleton count={6} className="py-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3" />
        ) : isError && posts.length === 0 ? (
          <ErrorState className="my-8" error={error} title="Articles could not be loaded" onRetry={refetch} />
        ) : posts.length === 0 ? (
          <EmptyState
            className="border-y border-border"
            icon={Newspaper}
            title="No articles have been published yet"
            description="Workshop news and practical repair advice will appear here once published."
            action={<Button asChild><Link to="/book">Request a repair booking</Link></Button>}
          />
        ) : hasFilters && visiblePosts.length === 0 ? (
          <NoResultsState className="border-y border-border" title="No articles match these filters" description={q.trim() ? `No articles matched “${q.trim()}”. Try another search or reset all filters.` : "Try another section or topic, or reset all filters."} onClear={clearFilters} clearLabel="Reset all filters" />
        ) : (
          <>
            {isError ? <ErrorState className="mb-8" error={error} title="Latest articles could not be refreshed" description="Previously loaded articles remain available below." onRetry={refetch} /> : null}
            <NewsLeadStories lead={visiblePosts[0]} secondary={visiblePosts.slice(1, 5)} categories={categories} />
            {visiblePosts.length > 5 && (
              <section className="py-8" aria-labelledby="latest-heading">
                <div className="mb-7 flex items-end justify-between border-b border-border pb-4"><h2 id="latest-heading" className="font-heading text-2xl font-bold sm:text-3xl">Latest articles</h2><span className="hidden text-xs font-semibold uppercase text-muted-foreground sm:block">News · Events · Advice</span></div>
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
