import { mutation } from "./_generated/server";
import { v } from "convex/values";

const VIEW_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export const recordView = mutation({
  args: {
    memeId: v.id("memes"),
    fingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("memeViews")
      .withIndex("by_memeId_fingerprint", (q) =>
        q.eq("memeId", args.memeId).eq("fingerprint", args.fingerprint),
      )
      .first();

    const now = Date.now();

    if (existing && now - existing.viewedAt < VIEW_DEDUP_WINDOW_MS) {
      return;
    }

    if (existing) {
      await ctx.db.patch(existing._id, { viewedAt: now });
    } else {
      await ctx.db.insert("memeViews", {
        memeId: args.memeId,
        fingerprint: args.fingerprint,
        viewedAt: now,
      });
    }

    const meme = await ctx.db.get(args.memeId);
    if (meme) {
      await ctx.db.patch(args.memeId, {
        viewCount: (meme.viewCount ?? 0) + 1,
      });
    }
  },
});
