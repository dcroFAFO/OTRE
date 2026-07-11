import React from "react";
import BlogShareButtons from "./BlogShareButtons";

export default function BlogShareBar({ title, url }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card/50 px-5 py-4">
      <BlogShareButtons title={title} url={url} />
    </div>
  );
}