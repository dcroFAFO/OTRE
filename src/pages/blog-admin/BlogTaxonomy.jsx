import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BlogAdminHeader from "@/components/blog/BlogAdminHeader";
import { CardSkeleton, ErrorState, FieldShell } from "@/components/shared";
import { listBlogAdminData, saveBlogTaxonomy, slugify } from "@/services/blogService";

export default function BlogTaxonomy() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["blogAdmin", "taxonomy"], queryFn: () => listBlogAdminData("taxonomy") });
  const save = useMutation({ mutationFn: saveBlogTaxonomy, onSuccess: () => qc.invalidateQueries({ queryKey: ["blogAdmin"] }) });
  return <div className="space-y-5"><BlogAdminHeader title="Categories & Tags" description="Create clean, reusable slugs for blog organisation." />{isLoading && <CardSkeleton count={2} />}{error && <ErrorState error={error} onRetry={refetch} />}{save.error && <ErrorState title="Taxonomy change failed" error={save.error} />}{!isLoading && !error && <div className="grid gap-5 lg:grid-cols-2"><TaxonomyPanel title="Categories" type="category" items={data?.categories || []} save={save} /><TaxonomyPanel title="Tags" type="tag" items={data?.tags || []} save={save} /></div>}</div>;
}
function TaxonomyPanel({ title, type, items, save }) {
  const empty = { name: "", slug: "", description: "" };
  const [form, setForm] = useState(/** @type {Record<string, any>} */ (empty));
  const isEditing = Boolean(form.id);
  const reset = () => setForm(empty);
  const submit = (item = form, onSuccess) => save.mutate({ type, id: item.id, data: { ...item, slug: item.slug || slugify(item.name) } }, { onSuccess });
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3"><FieldShell id={`${type}-name`} label="Name" required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))} /></FieldShell><FieldShell id={`${type}-slug`} label="Slug" required><Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} /></FieldShell><FieldShell id={`${type}-description`} label="Description"><Textarea value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></FieldShell><div className="flex flex-wrap gap-2"><Button className="min-h-11" onClick={() => submit(form, reset)} disabled={save.isPending || !form.name.trim()}>{save.isPending ? "Saving…" : isEditing ? `Update ${type}` : `Create ${type}`}</Button>{isEditing && <Button className="min-h-11" variant="outline" onClick={reset} disabled={save.isPending}>Cancel edit</Button>}</div></div><div className="space-y-2">{items.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">/{item.slug}</p></div><div className="flex flex-wrap gap-2"><Button className="min-h-11" size="sm" variant="outline" onClick={() => setForm(item)} disabled={save.isPending}>Edit</Button><Button className="min-h-11" size="sm" variant="ghost" onClick={() => { if (window.confirm(`Deactivate “${item.name}”? Existing posts keep their saved relationship.`)) submit({ ...item, is_active: false }); }} disabled={save.isPending || item.is_active === false}>Deactivate</Button></div></div>)}{items.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No {title.toLowerCase()} yet.</p>}</div></CardContent></Card>;
}
