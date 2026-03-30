/* eslint-disable @next/next/no-img-element */
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Eye, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface MemeDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memeId: Id<"memes"> | null;
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

export function MemeDetailDrawer({
  open,
  onOpenChange,
  memeId,
}: MemeDetailDrawerProps) {
  const detail = useQuery(
    api.admin.getMemeAdminDetail,
    memeId ? { memeId } : "skip",
  );
  const adminDeleteComment = useMutation(api.admin.adminDeleteComment);

  const handleDeleteComment = async (commentId: Id<"comments">) => {
    try {
      await adminDeleteComment({ commentId });
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Meme Details</SheetTitle>
        </SheetHeader>
        {detail ? (
          <div className="space-y-6 mt-4">
            <img
              src={detail.imageUrl}
              alt={detail.description}
              className="w-full h-64 object-contain rounded-lg bg-black/20"
            />

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {detail.description}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={`/meme/${detail.shortId}`}
                  className="text-primary hover:underline text-xs font-mono"
                >
                  {detail.shortId}
                </Link>
                <ExternalLink className="size-3 text-muted-foreground" />
                {detail.isNsfw && (
                  <Badge variant="destructive" className="text-xs">
                    NSFW
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="size-4" />
                {detail.viewCount} views
              </span>
              <span>{detail.totalReactions} reactions</span>
              <span>{detail.comments.length} comments</span>
            </div>

            {detail.reactionBreakdown.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Reaction Breakdown</h4>
                <div className="flex flex-wrap gap-2">
                  {detail.reactionBreakdown.map((r) => (
                    <span
                      key={r.emoji}
                      className="inline-flex items-center gap-1 rounded-full border border-border/50 px-3 py-1 text-sm"
                    >
                      {r.emoji} <span className="font-medium">{r.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-medium">
                Comments ({detail.comments.length})
              </h4>
              {detail.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments</p>
              ) : (
                detail.comments.map((comment) => (
                  <div
                    key={comment._id}
                    className="rounded-lg border border-border/30 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(comment.createdAt)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteComment(comment._id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {comment.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : memeId ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
