import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import BlogPostCard from "@/components/blog/BlogPostCard";
import { listPublicBlog } from "@/services/blogService";

export default function MobileResourceSection() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPublicBlog()
      .then((data) => {
        setPosts((data?.posts || []).slice(0, 3));
        setCategories(data?.categories || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && posts.length === 0) return null;

  return (
    <section id="resources" className="px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Rider resources</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight">Tips from the workshop</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Practical advice to help you look after your scooter, plus the latest news from On The Run Electrics.</p>
          </div>
          <Link to="/blog" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground hover:text-accent">
            View all articles <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {loading ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="aspect-[4/3] w-full animate-pulse rounded-xl bg-secondary" />)}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {posts.map((post) => (
              <BlogPostCard key={post.id} post={post} category={categories.find((c) => c.id === post.category_id)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}