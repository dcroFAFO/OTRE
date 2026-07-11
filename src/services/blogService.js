import { base44 } from "@/api/base44Client";

export const BLOG_STATUSES = ["draft", "scheduled", "published", "archived"];

export function slugify(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

export function countWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

export function readingTime(text) {
  return Math.max(1, Math.ceil(countWords(text) / 220));
}

export function emptyPost(user, settings) {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content_markdown: "",
    status: "draft",
    target_keyword: "",
    category_id: "",
    tag_ids: [],
    author_name: settings?.default_author_name || user?.full_name || "OTR Scooters",
    author_bio: settings?.default_author_bio || "",
    author_avatar_url: settings?.default_author_avatar_url || "",
    featured_image_url: "",
    featured_image_alt: "",
    meta_title: "",
    meta_description: "",
    canonical_url: "",
    scheduled_at: ""
  };
}

const invoke = async (name, payload = {}) => (await base44.functions.invoke(name, payload)).data;

export const listBlogAdminData = (action = "dashboard") => invoke("blogAdminData", { action });
export const listPublicBlog = (payload = {}) => invoke("publicBlog", payload);
export const saveBlogSettings = (settings) => invoke("saveBlogSettings", settings);
export const saveBlogTaxonomy = (payload) => invoke("saveBlogTaxonomy", payload);
export const createBlogPost = (post) => invoke("createBlogPost", post);
export const updateBlogPost = (postId, data) => invoke("updateBlogPost", { postId, data });
export const publishBlogPostNow = (postId) => invoke("publishBlogPostNow", { postId });
export const scheduleBlogPost = (postId, scheduled_at) => invoke("scheduleBlogPost", { postId, scheduled_at });
export const cancelScheduledBlogPost = (postId) => invoke("cancelScheduledBlogPost", { postId });
export const archiveBlogPost = (postId) => invoke("archiveBlogPost", { postId });
export const generateBlogPost = (payload) => invoke("generateBlogPost", payload);

// Blog comments — entity SDK is used directly: read is public (RLS read: null),
// create requires a logged-in user (RLS create: true).
export const listBlogComments = (postId) =>
  base44.entities.BlogComment.filter({ post_id: postId, status: "visible" }, "created_date", 500);

export const createBlogComment = (data) =>
  base44.entities.BlogComment.create(data);

export const deleteBlogComment = (commentId) =>
  base44.entities.BlogComment.delete(commentId);