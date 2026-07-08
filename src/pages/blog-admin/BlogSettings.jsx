import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import BlogAdminHeader from "@/components/blog/BlogAdminHeader";
import { listBlogAdminData, saveBlogSettings } from "@/services/blogService";

const defaults = { blog_enabled: true, blog_name: "OTR Scooters Blog", blog_description: "Helpful scooter repair and maintenance advice.", default_author_name: "OTR Scooters", default_author_bio: "Electric scooter repair specialists.", default_author_avatar_url: "", default_blog_route: "/blog", posts_per_page: 9, show_author_box: true, show_related_posts: true, enable_ai_generation: true, enable_scheduled_publishing: true };

export default function BlogSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["blogAdmin", "settings"], queryFn: () => listBlogAdminData("settings") });
  const [form, setForm] = useState(defaults);
  useEffect(() => { if (data) setForm({ ...defaults, ...(data.settings || {}) }); }, [data]);
  const save = useMutation({ mutationFn: saveBlogSettings, onSuccess: () => qc.invalidateQueries({ queryKey: ["blogAdmin"] }) });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  return <div className="space-y-5"><BlogAdminHeader title="Blog Settings" description="Configure the public blog and default author details." /><Card><CardContent className="grid gap-4 p-5 sm:grid-cols-2"><Check label="Enable blog" checked={form.blog_enabled} onChange={(v) => set("blog_enabled", v)} /><Check label="Show author box" checked={form.show_author_box} onChange={(v) => set("show_author_box", v)} /><Check label="Show related posts" checked={form.show_related_posts} onChange={(v) => set("show_related_posts", v)} /><Check label="Enable AI blog generation" checked={form.enable_ai_generation} onChange={(v) => set("enable_ai_generation", v)} /><Check label="Enable scheduled publishing" checked={form.enable_scheduled_publishing} onChange={(v) => set("enable_scheduled_publishing", v)} /><Field label="Blog name"><Input value={form.blog_name || ""} onChange={(e) => set("blog_name", e.target.value)} /></Field><Field label="Default blog route"><Input value={form.default_blog_route || "/blog"} onChange={(e) => set("default_blog_route", e.target.value)} /></Field><Field label="Posts per page"><Input type="number" value={form.posts_per_page || 9} onChange={(e) => set("posts_per_page", Number(e.target.value) || 9)} /></Field><Field label="Default author name"><Input value={form.default_author_name || ""} onChange={(e) => set("default_author_name", e.target.value)} /></Field><Field label="Author avatar URL"><Input value={form.default_author_avatar_url || ""} onChange={(e) => set("default_author_avatar_url", e.target.value)} /></Field><Field label="Blog description"><Textarea value={form.blog_description || ""} onChange={(e) => set("blog_description", e.target.value)} /></Field><Field label="Default author bio"><Textarea value={form.default_author_bio || ""} onChange={(e) => set("default_author_bio", e.target.value)} /></Field><div className="sm:col-span-2"><Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save settings"}</Button></div></CardContent></Card></div>;
}
function Field({ label, children }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function Check({ label, checked, onChange }) { return <label className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>; }