"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getFingerprint } from "@/lib/fingerprint";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, Trash2, Pencil, X, Check, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface CommentSectionProps {
  memeId: Id<"memes">;
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CommentSection({ memeId }: CommentSectionProps) {
  const comments = useQuery(api.comments.getCommentsForMeme, { memeId });
  const addComment = useMutation(api.comments.addComment);
  const deleteComment = useMutation(api.comments.deleteComment);
  const editComment = useMutation(api.comments.editComment);

  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<Id<"comments"> | null>(null);
  const [editText, setEditText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fingerprint = typeof window !== "undefined" ? getFingerprint() : "";

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment({
        memeId,
        fingerprint,
        name: name.trim() || "Anonymous",
        text: trimmed,
      });
      setText("");
      toast("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  }, [text, name, memeId, fingerprint, addComment, isSubmitting]);

  const handleDelete = useCallback(
    async (commentId: Id<"comments">) => {
      try {
        await deleteComment({ commentId, fingerprint });
        toast("Comment deleted");
      } catch {
        toast.error("Failed to delete comment");
      }
    },
    [deleteComment, fingerprint],
  );

  const handleEdit = useCallback(
    async (commentId: Id<"comments">) => {
      const trimmed = editText.trim();
      if (!trimmed) return;

      try {
        await editComment({ commentId, fingerprint, text: trimmed });
        setEditingId(null);
        setEditText("");
        toast("Comment updated");
      } catch {
        toast.error("Failed to edit comment");
      }
    },
    [editComment, fingerprint, editText],
  );

  return (
    <div className="w-full space-y-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <MessageSquare className="size-5" />
        Comments {comments && comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment form */}
      <div className="space-y-2 rounded-lg border border-border/50 p-3">
        <Input
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="bg-background"
        />
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder="Write a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={2}
            className="bg-background resize-none pr-16"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleSubmit();
              }
            }}
          />
          <span className="absolute bottom-2 right-12 text-xs text-muted-foreground">
            {text.length}/500
          </span>
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitting}
            className="gap-1.5"
          >
            <Send className="size-3.5" />
            Post
          </Button>
        </div>
      </div>

      {/* Comment list */}
      {comments && comments.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No comments yet. Be the first!
        </p>
      )}
      <div className="space-y-3">
        {comments?.map((comment) => {
          const isOwn = comment.fingerprint === fingerprint;
          const isEditing = editingId === comment._id;

          return (
            <div
              key={comment._id}
              className="rounded-lg border border-border/30 p-3 space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(comment.createdAt)}
                    {comment.updatedAt && " (edited)"}
                  </span>
                </div>
                {isOwn && !isEditing && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingId(comment._id);
                        setEditText(comment.text);
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Edit comment"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(comment._id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    maxLength={500}
                    rows={2}
                    className="bg-background resize-none"
                  />
                  <div className="flex items-center gap-1.5 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        setEditText("");
                      }}
                    >
                      <X className="size-3.5 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEdit(comment._id)}
                      disabled={!editText.trim()}
                    >
                      <Check className="size-3.5 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap wrap-break-word">
                  {comment.text}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
