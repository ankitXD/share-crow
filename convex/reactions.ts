import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ALLOWED_EMOJIS = ["😂", "🔥", "💀", "❤️", "👎", "😮"];

export const toggleReaction = mutation({
  args: {
    memeId: v.id("memes"),
    fingerprint: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    if (!ALLOWED_EMOJIS.includes(args.emoji)) {
      throw new Error("Invalid emoji");
    }

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_memeId_fingerprint", (q) =>
        q.eq("memeId", args.memeId).eq("fingerprint", args.fingerprint),
      )
      .first();

    if (existing) {
      if (existing.emoji === args.emoji) {
        await ctx.db.delete(existing._id);
        return { action: "removed" as const };
      } else {
        await ctx.db.patch(existing._id, {
          emoji: args.emoji,
          createdAt: Date.now(),
        });
        return { action: "changed" as const };
      }
    }

    await ctx.db.insert("reactions", {
      memeId: args.memeId,
      fingerprint: args.fingerprint,
      emoji: args.emoji,
      createdAt: Date.now(),
    });
    return { action: "added" as const };
  },
});

export const getReactionsForMeme = query({
  args: {
    memeId: v.id("memes"),
    fingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_memeId", (q) => q.eq("memeId", args.memeId))
      .collect();

    const countsMap: Record<string, number> = {};
    let userReaction: string | null = null;

    for (const r of reactions) {
      countsMap[r.emoji] = (countsMap[r.emoji] ?? 0) + 1;
      if (args.fingerprint && r.fingerprint === args.fingerprint) {
        userReaction = r.emoji;
      }
    }

    const counts = Object.entries(countsMap).map(([emoji, count]) => ({
      emoji,
      count,
    }));
    return { counts, userReaction };
  },
});

export const getReactionsSummary = query({
  args: {
    memeIds: v.array(v.id("memes")),
    fingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result: Array<{
      memeId: string;
      counts: Array<{ emoji: string; count: number }>;
      userReaction: string | null;
    }> = [];

    for (const memeId of args.memeIds) {
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_memeId", (q) => q.eq("memeId", memeId))
        .collect();

      const countsMap: Record<string, number> = {};
      let userReaction: string | null = null;

      for (const r of reactions) {
        countsMap[r.emoji] = (countsMap[r.emoji] ?? 0) + 1;
        if (args.fingerprint && r.fingerprint === args.fingerprint) {
          userReaction = r.emoji;
        }
      }

      const counts = Object.entries(countsMap).map(([emoji, count]) => ({
        emoji,
        count,
      }));
      result.push({ memeId, counts, userReaction });
    }

    return result;
  },
});
