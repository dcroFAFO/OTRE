import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";

const MAX_SCAN = 200;

function requestId(req: Request) {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}

function ok(data: unknown, id: string) {
  return Response.json({ ok: true, data, request_id: id });
}

function fail(code: string, message: string, id: string, status: number) {
  return Response.json(
    { ok: false, error: { code, message }, request_id: id },
    { status },
  );
}

function clean(value: unknown, maxLength = 500) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(
    0,
    maxLength,
  );
}

function automationsEnabled() {
  return Deno.env.get("AUTOMATIONS_ENABLED") === "true";
}

async function requireAdmin(base44: any) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) return { error: "unauthorized", status: 401 };
  // Scheduled runs inherit the automation creator. The live automation must be
  // owned by the durable admin operator account.
  if (user.role !== "admin") return { error: "forbidden", status: 403 };
  return { user };
}

async function logOnce(db: any, post: any, eventType: string, status: string, message: string) {
  const existing = await db.BlogLog.filter({
    related_post_id: post.id,
    event_type: eventType,
    status,
  }, "-created_date", 1).catch(() => []);
  if (existing[0]) return false;
  await db.BlogLog.create({
    user_id: post.user_id || "automation",
    event_type: eventType,
    related_post_id: post.id,
    status,
    message: clean(message, 1000),
    created_at: new Date().toISOString(),
  });
  return true;
}

Deno.serve(async (req: Request) => {
  const id = requestId(req);
  try {
    if (req.method !== "POST") {
      return fail("method_not_allowed", "Use POST for this action.", id, 405);
    }
    if (!automationsEnabled()) {
      return fail(
        "automation_disabled",
        "Scheduled blog publishing is disabled.",
        id,
        503,
      );
    }
    const base44 = createClientFromRequest(req);
    const principal = await requireAdmin(base44);
    if (principal.error) {
      return fail(
        principal.error,
        principal.error === "unauthorized"
          ? "An administrator session is required."
          : "Administrator access is required.",
        id,
        principal.status,
      );
    }

    const db = base44.asServiceRole.entities;
    const due = await db.BlogPost.filter(
      { status: "scheduled" },
      "scheduled_at",
      MAX_SCAN,
    );
    const now = Date.now();
    const summary = {
      scanned: due.length,
      scan_limit: MAX_SCAN,
      published: 0,
      not_due: 0,
      invalid: 0,
      state_changed: 0,
      duplicate_log_prevented: 0,
      published_ids: [] as string[],
    };

    for (const candidate of due) {
      const scheduledAt = new Date(candidate.scheduled_at || "").getTime();
      if (!Number.isFinite(scheduledAt) || scheduledAt > now) {
        summary.not_due += 1;
        continue;
      }
      const post = await db.BlogPost.get(candidate.id).catch(() => null);
      if (!post || post.status !== "scheduled") {
        summary.state_changed += 1;
        continue;
      }
      if (!post.title || !post.slug || !post.content_markdown) {
        summary.invalid += 1;
        const created = await logOnce(
          db,
          post,
          "publishing_failed",
          "failed",
          "Scheduled post is missing title, slug or content",
        );
        if (!created) summary.duplicate_log_prevented += 1;
        continue;
      }

      const publishedAt = post.published_at || new Date(now).toISOString();
      await db.BlogPost.update(post.id, {
        status: "published",
        published_at: publishedAt,
        updated_at: new Date().toISOString(),
      });
      const created = await logOnce(
        db,
        post,
        "post_published",
        "success",
        `Published scheduled post: ${post.title}`,
      );
      if (!created) summary.duplicate_log_prevented += 1;
      summary.published += 1;
      summary.published_ids.push(post.id);
    }

    return ok(summary, id);
  } catch (error) {
    console.error("[processScheduledBlogPosts]", JSON.stringify({
      request_id: id,
      code: "scheduled_blog_publish_failed",
      message: clean(error?.message || error, 500),
    }));
    return fail(
      "internal_error",
      "Scheduled blog posts could not be processed.",
      id,
      500,
    );
  }
});
