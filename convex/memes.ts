import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { customAlphabet } from "nanoid";

const PAGE_SIZE = 6;

// Generate a 7-character ID using Base62 character set (0-9, a-z, A-Z)
const nanoid = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  7,
);

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

// Query to get paginated memes
export const getMemesWithPagination = query({
  args: { page: v.number() },
  handler: async (ctx, args) => {
    const page = Math.max(1, args.page);
    const skip = (page - 1) * PAGE_SIZE;

    // Get all memes sorted
    const allMemes = await ctx.db
      .query("memes")
      .withIndex("by_uploadedAt")
      .order("desc")
      .collect();

    const totalCount = allMemes.length;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // Get paginated memes
    const memes = allMemes.slice(skip, skip + PAGE_SIZE);

    return {
      memes,
      currentPage: page,
      totalPages,
      totalCount,
      pageSize: PAGE_SIZE,
    };
  },
});

// Query to get a single meme by ID
export const getMeme = query({
  args: { id: v.id("memes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Query to get a single meme by shortId
export const getMemeByShortId = query({
  args: { shortId: v.string() },
  handler: async (ctx, args) => {
    const meme = await ctx.db
      .query("memes")
      .withIndex("by_shortId", (q) => q.eq("shortId", args.shortId))
      .first();
    return meme;
  },
});

// Mutation to add a new meme
export const addMeme = mutation({
  args: {
    imageUrl: v.string(),
    description: v.string(),
    isNsfw: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Generate a unique shortId with collision check
    let shortId = nanoid();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await ctx.db
        .query("memes")
        .withIndex("by_shortId", (q) => q.eq("shortId", shortId))
        .first();

      if (!existing) {
        // shortId is unique
        break;
      }

      // Collision detected, generate a new one
      shortId = nanoid();
      attempts++;
    }

    if (attempts === maxAttempts) {
      throw new Error(
        "Failed to generate unique shortId after multiple attempts",
      );
    }

    const memeId = await ctx.db.insert("memes", {
      imageUrl: args.imageUrl,
      description: args.description,
      isNsfw: args.isNsfw,
      uploadedAt: Date.now(),
      shortId: shortId,
    });
    return memeId;
  },
});
