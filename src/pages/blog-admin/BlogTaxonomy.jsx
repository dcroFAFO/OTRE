import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BlogAdminHeader from "@/components/blog/BlogAdminHeader";
import { listBlogAdminData, saveBlogTaxonomy, slugify } from "@/services/blogService";

export default function BlogTaxonomy() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["blogAdmin", "taxonomy"], queryFn: () => listBlogAdminData("taxonomy") });
  const save = useMutation({ mutationFn: saveBlogTaxonomy, onSuccess: () => qc.invalidateQueries({ queryKey: ["blogAdmin"] }) });
  return <div className="space-y-5"><BlogAdminHeader title="Categories & Tags" description="Create clean, reusable slugs for blog organisation." /><div className="grid gap-5 lg:grid-cols-2"><TaxonomyPanel title="Categories" type="category" items={data?.categories || []} save={save} /><TaxonomyPanel title="Tags" type="tag" items={data?.tags || []} save={save} /></div></div>;
}
function TaxonomyPanel({ title, type, items, save }) {
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const submit = (item = form) => save.mutate({ type, id: item.id, data: { ...item, slug: item.slug || slugify(item.name) } });
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-2"><Input placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))} /><Input placeholder="Slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} /><Textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /><Button onClick={() => submit()}>Create {type}</Button></div><div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-border p-3"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">/{item.slug}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setForm(item)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => submit({ ...item, is_active: false })}>Deactivate</Button></div></div>)}</div></CardContent></Card>;
}