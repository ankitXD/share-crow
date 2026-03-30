"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getFingerprint } from "@/lib/fingerprint";

import { REACTION_EMOJIS } from "@/lib/reactions";
import { useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ReactionBarProps {
  memeId: Id<"memes">;
  counts: Array<{ emoji: string; count: number }>;
  userReaction: string | null;
  size?: "sm" | "lg";
}

export function ReactionBar({
  memeId,
  counts = [],
  userReaction,
  size = "sm",
}: ReactionBarProps) {
  const toggleReaction = useMutation(api.reactions.toggleReaction);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleReaction = useCallback(
    (emoji: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        toggleReaction({
          memeId,
          fingerprint: getFingerprint(),
          emoji,
        });
      }, 300);
    },
    [memeId, toggleReaction],
  );

  const countsMap: Record<string, number> = {};
  for (const c of counts ?? []) {
    countsMap[c.emoji] = c.count;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTION_EMOJIS.map((emoji) => {
        const count = countsMap[emoji] ?? 0;
        const isActive = userReaction === emoji;

        return (
          <button
            key={emoji}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleReaction(emoji);
            }}
            aria-label={`React with ${emoji}${count > 0 ? ` (${count})` : ""}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition-colors",
              size === "lg" ? "text-base px-3 py-1" : "text-sm",
              isActive
                ? "border-primary bg-primary/20 text-primary"
                : "border-border/50 hover:border-primary/50 hover:bg-primary/10 text-muted-foreground",
            )}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
