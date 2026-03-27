import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/<[^>]*>/g, "")
    .slice(0, 500);
}

export const addComment = mutation({
  args: {
    memeId: v.id("memes"),
    fingerprint: v.string(),
    name: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanText = sanitizeText(args.text);
    if (cleanText.length === 0) {
      throw new Error("Comment cannot be empty");
    }

    const cleanName =
      args.name
        .trim()
        .replace(/<[^>]*>/g, "")
        .slice(0, 50) || "Anonymous";

    return await ctx.db.insert("comments", {
      memeId: args.memeId,
      fingerprint: args.fingerprint,
      name: cleanName,
      text: cleanText,
      createdAt: Date.now(),
    });
  },
});

export const getCommentsForMeme = query({
  args: { memeId: v.id("memes") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_memeId_createdAt", (q) => q.eq("memeId", args.memeId))
      .order("desc")
      .collect();

    return comments
      .filter((c) => !c.isDeleted)
      .map((c) => ({
        _id: c._id,
        name: c.name,
        text: c.text,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        fingerprint: c.fingerprint,
      }));
  },
});

export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
    fingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.fingerprint !== args.fingerprint) {
      throw new Error("Not authorized to delete this comment");
    }
    await ctx.db.patch(args.commentId, { isDeleted: true });
  },
});

export const editComment = mutation({
  args: {
    commentId: v.id("comments"),
    fingerprint: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.fingerprint !== args.fingerprint) {
      throw new Error("Not authorized to edit this comment");
    }

    const cleanText = sanitizeText(args.text);
    if (cleanText.length === 0) {
      throw new Error("Comment cannot be empty");
    }

    await ctx.db.patch(args.commentId, {
      text: cleanText,
      updatedAt: Date.now(),
    });
  },
});

export const getCommentCount = query({
  args: { memeId: v.id("memes") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_memeId", (q) => q.eq("memeId", args.memeId))
      .collect();
    return comments.filter((c) => !c.isDeleted).length;
  },
});
