import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const allowedFields = [
      "content_markdown",
      "meta_title",
      "excerpt",
      "word_count",
      "reading_time_minutes",
      "status",
      "featured_image_url",
      "featured_image_alt",
      "tag_ids",
    ];
    const updates = Object.fromEntries(
      allowedFields
        .filter((field) => body[field] !== undefined)
        .map((field) => [field, body[field]])
    );

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No supported fields supplied" }, { status: 400 });
    }

    const post = await base44.asServiceRole.entities.BlogPost.update(id, updates);
    return Response.json({ success: true, post });
  } catch (error) {
    console.error("saveBlogContent failed", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});