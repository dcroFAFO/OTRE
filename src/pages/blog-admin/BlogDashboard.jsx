import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PenLine, Sparkles, Tags, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BlogAdminHeader from "@/components/blog/BlogAdminHeader";
import BlogStatusBadge from "@/components/blog/BlogStatusBadge";
import { listBlogAdminData } from "@/services/blogService";

export default function BlogDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["blogAdmin", "dashboard"], queryFn: () => listBlogAdminData("dashboard") });
  const posts = data?.posts || [];
  const counts = ["draft", "scheduled", "published"].map((status) => ({ status, count: posts.filter((p) => p.status === status).length }));
  return (
    <div className="space-y-6">
      <BlogAdminHeader title="Blog Dashboard" description="Create, schedule and publish SEO-friendly blog posts." actionTo="/dashboard/blog/posts/new" actionLabel="Create Post" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total posts" value={posts.length} />
        {counts.map((item) => <Stat key={item.status} label={item.status} value={item.count} />)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Quick to="/dashboard/blog/posts/new" icon={PenLine} label="Create Post" />
        <Quick to="/dashboard/blog/generate" icon={Sparkles} label="Generate with AI" />
        <Quick to="/dashboard/blog/taxonomy" icon={Tags} label="Categories & Tags" />
        <Quick to="/dashboard/blog/settings" icon={Settings} label="Blog Settings" />
      </div>
      <Card>
        <CardHeader><CardTitle>Recent posts</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading posts…</p> : posts.slice(0, 6).map((post) => (
            <Link key={post.id} to={`/dashboard/blog/posts/${post.id}`} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-secondary/60">
              <span className="font-medium">{post.title}</span><BlogStatusBadge status={post.status} />
            </Link>
          ))}
          {!isLoading && posts.length === 0 && <p className="text-sm text-muted-foreground">No blog posts yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
function Stat({ label, value }) { return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground capitalize">{label}</p><p className="mt-2 text-3xl font-extrabold">{value}</p></CardContent></Card>; }
function Quick({ to, icon: Icon, label }) { return <Button variant="outline" asChild className="h-auto justify-start rounded-2xl p-4"><Link to={to}><Icon className="h-5 w-5" />{label}</Link></Button>; }