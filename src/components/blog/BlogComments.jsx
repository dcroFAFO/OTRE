import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MessageCircle, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { listBlogComments, createBlogComment, deleteBlogComment } from "@/services/blogService";

export default function BlogComments({ postId, postSlug }) {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["blogComments", postId],
    queryFn: () => listBlogComments(postId),
    enabled: !!postId,
  });

  const createMutation = useMutation({
    mutationFn: (text) =>
      createBlogComment({
        post_id: postId,
        post_slug: postSlug,
        author_name: user?.full_name || user?.email || "Anonymous",
        author_user_id: user?.id,
        content: text.trim(),
        status: "visible",
      }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["blogComments", postId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId) => deleteBlogComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogComments", postId] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    createMutation.mutate(content);
  };

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-accent" />
        <h2 className="font-heading text-2xl font-bold">
          Comments {comments.length > 0 && <span className="text-muted-foreground">({comments.length})</span>}
        </h2>
      </div>

      {/* Comment form */}
      {user ? (
        <form onSubmit={handleSubmit} className="mt-5">
          <Textarea
            placeholder="Share your thoughts…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            rows={3}
            className="resize-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{content.length}/2000</span>
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post comment
            </Button>
          </div>
          {createMutation.isError && (
            <p className="mt-2 text-sm text-destructive">
              Couldn't post your comment. Please try again.
            </p>
          )}
        </form>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Want to join the conversation?{" "}
            <Link to="/login" className="font-semibold text-accent hover:underline">
              Log in
            </Link>{" "}
            to leave a comment.
          </p>
        </div>
      )}

      {/* Comment list */}
      {isLoading ? (
        <div className="mt-6 grid place-items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
          No comments yet. Be the first to share your thoughts.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                    {(comment.author_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{comment.author_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {comment.created_date
                        ? new Date(comment.created_date).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                    </p>
                  </div>
                </div>
                {user?.id === comment.author_user_id && (
                  <button
                    onClick={() => deleteMutation.mutate(comment.id)}
                    disabled={deleteMutation.isPending}
                    aria-label="Delete your comment"
                    className="text-muted-foreground/50 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}