import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAdminOverview = query({
  handler: async (ctx) => {
    const allMemes = await ctx.db.query("memes").collect();
    const totalMemes = allMemes.length;
    const totalViews = allMemes.reduce((sum, m) => sum + (m.viewCount ?? 0), 0);

    const allReactions = await ctx.db.query("reactions").collect();
    const totalReactions = allReactions.length;

    const allComments = await ctx.db.query("comments").collect();
    const totalComments = allComments.filter((c) => !c.isDeleted).length;

    return { totalMemes, totalViews, totalReactions, totalComments };
  },
});

export const getAllMemesWithStats = query({
  handler: async (ctx) => {
    const allMemes = await ctx.db
      .query("memes")
      .withIndex("by_uploadedAt")
      .order("desc")
      .collect();

    const memesWithStats = await Promise.all(
      allMemes.map(async (meme) => {
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_memeId", (q) => q.eq("memeId", meme._id))
          .collect();

        const comments = await ctx.db
          .query("comments")
          .withIndex("by_memeId", (q) => q.eq("memeId", meme._id))
          .collect();

        return {
          ...meme,
          reactionCount: reactions.length,
          commentCount: comments.filter((c) => !c.isDeleted).length,
          viewCount: meme.viewCount ?? 0,
        };
      }),
    );

    return memesWithStats;
  },
});

export const getMemeAdminDetail = query({
  args: { memeId: v.id("memes") },
  handler: async (ctx, args) => {
    const meme = await ctx.db.get(args.memeId);
    if (!meme) return null;

    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_memeId", (q) => q.eq("memeId", args.memeId))
      .collect();

    const countsMap: Record<string, number> = {};
    for (const r of reactions) {
      countsMap[r.emoji] = (countsMap[r.emoji] ?? 0) + 1;
    }
    const reactionBreakdown = Object.entries(countsMap).map(
      ([emoji, count]) => ({ emoji, count }),
    );

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_memeId_createdAt", (q) => q.eq("memeId", args.memeId))
      .order("desc")
      .collect();

    const activeComments = comments
      .filter((c) => !c.isDeleted)
      .map((c) => ({
        _id: c._id,
        name: c.name,
        text: c.text,
        fingerprint: c.fingerprint,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

    return {
      ...meme,
      viewCount: meme.viewCount ?? 0,
      reactionBreakdown,
      totalReactions: reactions.length,
      comments: activeComments,
    };
  },
});

export const updateMeme = mutation({
  args: {
    memeId: v.id("memes"),
    description: v.optional(v.string()),
    isNsfw: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const meme = await ctx.db.get(args.memeId);
    if (!meme) throw new Error("Meme not found");

    const updates: Record<string, string | boolean> = {};
    if (args.description !== undefined) updates.description = args.description;
    if (args.isNsfw !== undefined) updates.isNsfw = args.isNsfw;

    await ctx.db.patch(args.memeId, updates);
  },
});

export const deleteMeme = mutation({
  args: { memeId: v.id("memes") },
  handler: async (ctx, args) => {
    const meme = await ctx.db.get(args.memeId);
    if (!meme) throw new Error("Meme not found");

    // Delete all reactions for this meme
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_memeId", (q) => q.eq("memeId", args.memeId))
      .collect();
    for (const r of reactions) await ctx.db.delete(r._id);

    // Delete all views for this meme
    const views = await ctx.db
      .query("memeViews")
      .withIndex("by_memeId_fingerprint", (q) => q.eq("memeId", args.memeId))
      .collect();
    for (const vi of views) await ctx.db.delete(vi._id);

    // Delete all comments for this meme
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_memeId", (q) => q.eq("memeId", args.memeId))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);

    // Delete the meme itself
    await ctx.db.delete(args.memeId);

    // Note: Cloudinary image cleanup should be handled via a separate action
  },
});

export const adminDeleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    await ctx.db.delete(args.commentId);
  },
});
