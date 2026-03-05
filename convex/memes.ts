import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Query to get all memes, sorted by upload date (newest first)
export const getMemes = query({
  handler: async (ctx) => {
    const memes = await ctx.db
      .query("memes")
      .withIndex("by_uploadedAt")
      .order("desc")
      .collect();
    return memes;
  },
});

// Query to get a single meme by ID
export const getMeme = query({
  args: { id: v.id("memes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Mutation to add a new meme
export const addMeme = mutation({
  args: {
    imageUrl: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const memeId = await ctx.db.insert("memes", {
      imageUrl: args.imageUrl,
      description: args.description,
      uploadedAt: Date.now(),
    });
    return memeId;
  },
});
