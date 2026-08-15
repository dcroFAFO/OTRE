import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/api/base44Client", () => ({
  base44: { functions: { invoke: mocks.invoke } },
}));

import { listPublicCatalog } from "@/services/catalogService";
import { createBlogComment, deleteBlogComment, listBlogComments } from "@/services/blogService";

describe("public DTO services", () => {
  beforeEach(() => mocks.invoke.mockReset());

  it("requests a filtered catalogue page and unwraps its safe envelope", async () => {
    const page = { items: [{ id: "product-1", name: "Tyre" }], page: 2, page_size: 48, has_more: false };
    mocks.invoke.mockResolvedValue({ data: { ok: true, data: page } });

    await expect(listPublicCatalog({ page: 2, pageSize: 48, category: "tyres", search: "road" })).resolves.toBe(page);
    expect(mocks.invoke).toHaveBeenCalledWith("publicCatalog", {
      page: 2,
      page_size: 48,
      category: "tyres",
      search: "road",
    });
  });

  it("exposes safe catalogue errors", async () => {
    mocks.invoke.mockResolvedValue({ status: 503, data: { ok: false, error: { code: "catalog_unavailable", message: "Catalogue unavailable." } } });
    await expect(listPublicCatalog()).rejects.toMatchObject({ message: "Catalogue unavailable.", code: "catalog_unavailable", status: 503 });
  });

  it("routes comment reads and owner mutations through publicBlog", async () => {
    const comment = { id: "comment-1", content: "Helpful", can_delete: true };
    mocks.invoke
      .mockResolvedValueOnce({ data: { comments: [comment] } })
      .mockResolvedValueOnce({ data: { comment } })
      .mockResolvedValueOnce({ data: { deleted: true } });

    await expect(listBlogComments("post-1")).resolves.toEqual([comment]);
    await expect(createBlogComment({ post_id: "post-1", content: "Helpful", author_user_id: "must-not-leak" })).resolves.toBe(comment);
    await expect(deleteBlogComment("comment-1")).resolves.toEqual({ deleted: true });

    expect(mocks.invoke.mock.calls).toEqual([
      ["publicBlog", { action: "comments", post_id: "post-1" }],
      ["publicBlog", { action: "comment_create", post_id: "post-1", content: "Helpful" }],
      ["publicBlog", { action: "comment_delete", comment_id: "comment-1" }],
    ]);
  });
});
