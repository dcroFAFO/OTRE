import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import BlogAdminHeader from "@/components/blog/BlogAdminHeader";
import { generateBlogPost, listBlogAdminData } from "@/services/blogService";

export default function BlogGenerator() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["blogAdmin", "generator"], queryFn: () => listBlogAdminData("generator") });
  const [form, setForm] = useState({ topic: "", target_keyword: "", secondary_keywords: "", search_intent: "informational", target_audience: "electric scooter owners", tone: "helpful and professional", article_length: "medium", category_id: "", tag_ids: [], call_to_action: "Book a scooter repair or service", custom_instructions: "" });
  const generate = useMutation({ mutationFn: generateBlogPost, onSuccess: (res) => navigate(`/dashboard/blog/posts/${res.post.id}`) });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  return <div className="space-y-5"><BlogAdminHeader title="AI Blog Generator" description="Generate a complete draft with SEO fields, then review before publishing." /><Card><CardContent className="grid gap-4 p-5 sm:grid-cols-2"><Field label="Topic"><Input value={form.topic} onChange={(e) => set("topic", e.target.value)} /></Field><Field label="Target keyword"><Input value={form.target_keyword} onChange={(e) => set("target_keyword", e.target.value)} /></Field><Field label="Secondary keywords"><Input value={form.secondary_keywords} onChange={(e) => set("secondary_keywords", e.target.value)} /></Field><Field label="Search intent"><Input value={form.search_intent} onChange={(e) => set("search_intent", e.target.value)} /></Field><Field label="Target audience"><Input value={form.target_audience} onChange={(e) => set("target_audience", e.target.value)} /></Field><Field label="Tone"><Input value={form.tone} onChange={(e) => set("tone", e.target.value)} /></Field><Field label="Article length"><select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.article_length} onChange={(e) => set("article_length", e.target.value)}><option>short</option><option>medium</option><option>long</option></select></Field><Field label="Category"><select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}><option value="">None</option>{data?.categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Tags"><select multiple className="h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.tag_ids} onChange={(e) => set("tag_ids", Array.from(e.target.selectedOptions).map((o) => o.value))}>{data?.tags?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field><Field label="Call to action"><Input value={form.call_to_action} onChange={(e) => set("call_to_action", e.target.value)} /></Field><div className="sm:col-span-2"><Field label="Custom instructions"><Textarea value={form.custom_instructions} onChange={(e) => set("custom_instructions", e.target.value)} /></Field></div><div className="sm:col-span-2"><Button onClick={() => generate.mutate(form)} disabled={generate.isPending || !form.topic}><Sparkles className="h-4 w-4" />{generate.isPending ? "Generating…" : "Generate draft"}</Button></div></CardContent></Card></div>;
}
function Field({ label, children }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }