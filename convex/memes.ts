import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const PAGE_SIZE = 6;

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

// Mutation to add a new meme
export const addMeme = mutation({
  args: {
    imageUrl: v.string(),
    description: v.string(),
    isNsfw: v.boolean(),
  },
  handler: async (ctx, args) => {
    const memeId = await ctx.db.insert("memes", {
      imageUrl: args.imageUrl,
      description: args.description,
      isNsfw: args.isNsfw,
      uploadedAt: Date.now(),
    });
    return memeId;
  },
});

// Temporary mutation to add isNsfw to existing memes
export const updateExistingMemes = mutation({
  args: {},
  handler: async (ctx) => {
    const memes = await ctx.db.query("memes").collect();
    const updates = [];
    for (const meme of memes) {
      if (meme.isNsfw === undefined) {
        updates.push(ctx.db.patch(meme._id, { isNsfw: false }));
      }
    }
    await Promise.all(updates);
    return `Updated ${updates.length} memes`;
  },
});
