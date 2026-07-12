import React from "react";
import BlogShareButtons from "./BlogShareButtons";

export default function BlogShareBar({ title, url }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-8">
      <BlogShareButtons title={title} url={url} />
    </div>
  );
}