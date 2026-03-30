import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";

async function requireAdmin(ctx: { db: QueryCtx["db"] }, sessionToken: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .first();
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Unauthorized: invalid or expired session");
  }
  const user = await ctx.db.get(session.userId);
  if (!user) {
    throw new Error("Unauthorized: user not found");
  }
  return user;
}

// Note: This loads entire tables for counting. At scale (10K+ memes),
// consider maintaining a separate stats singleton document updated via mutations.
export const getAdminOverview = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
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
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const allMemes = await ctx.db
      .query("memes")
      .withIndex("by_uploadedAt")
      .order("desc")
      .collect();

    // Batch-fetch all reactions and comments to avoid N+1 queries
    const allReactions = await ctx.db.query("reactions").collect();
    const allComments = await ctx.db.query("comments").collect();

    // Group by memeId in memory
    const reactionsByMeme = new Map<string, number>();
    for (const r of allReactions) {
      reactionsByMeme.set(r.memeId, (reactionsByMeme.get(r.memeId) ?? 0) + 1);
    }

    const commentsByMeme = new Map<string, number>();
    for (const c of allComments) {
      if (!c.isDeleted) {
        commentsByMeme.set(c.memeId, (commentsByMeme.get(c.memeId) ?? 0) + 1);
      }
    }

    return allMemes.map((meme) => ({
      ...meme,
      reactionCount: reactionsByMeme.get(meme._id) ?? 0,
      commentCount: commentsByMeme.get(meme._id) ?? 0,
      viewCount: meme.viewCount ?? 0,
    }));
  },
});

export const getMemeAdminDetail = query({
  args: { memeId: v.id("memes"), sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
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
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const meme = await ctx.db.get(args.memeId);
    if (!meme) throw new Error("Meme not found");

    const updates: Record<string, string | boolean> = {};
    if (args.description !== undefined) updates.description = args.description;
    if (args.isNsfw !== undefined) updates.isNsfw = args.isNsfw;

    await ctx.db.patch(args.memeId, updates);
  },
});

export const deleteMeme = mutation({
  args: { memeId: v.id("memes"), sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const meme = await ctx.db.get(args.memeId);
    if (!meme) throw new Error("Meme not found");

    // Cascade delete related records.
    // Convex mutations are atomic per-function — if this times out with many
    // related records, consider using a scheduled function to clean up in batches.
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
  args: { commentId: v.id("comments"), sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    await ctx.db.delete(args.commentId);
  },
});
