import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { customAlphabet } from "nanoid";

const PAGE_SIZE = 6;
const MAX_DESCRIPTION_LENGTH = 500;
const CLOUDINARY_URL_PREFIX = "https://res.cloudinary.com/";

// Generate a 7-character ID using Base62 character set (0-9, a-z, A-Z)
const nanoid = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  7,
);

function validateCloudinaryUrl(url: string) {
  if (!url.startsWith(CLOUDINARY_URL_PREFIX)) {
    throw new Error("Invalid image URL: must be a Cloudinary URL");
  }
}

async function requireAuth(ctx: { db: QueryCtx["db"] }, sessionToken: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .first();
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Unauthorized: invalid or expired session");
  }
  return session;
}

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
  args: { page: v.number(), fingerprint: v.optional(v.string()) },
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

    // Join reaction counts, comment counts for each meme
    const memesWithMeta = await Promise.all(
      memes.map(async (meme) => {
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_memeId", (q) => q.eq("memeId", meme._id))
          .collect();

        const countsMap: Record<string, number> = {};
        let userReaction: string | null = null;
        for (const r of reactions) {
          countsMap[r.emoji] = (countsMap[r.emoji] ?? 0) + 1;
          if (args.fingerprint && r.fingerprint === args.fingerprint) {
            userReaction = r.emoji;
          }
        }
        const reactionCounts = Object.entries(countsMap).map(
          ([emoji, count]) => ({ emoji, count }),
        );

        const comments = await ctx.db
          .query("comments")
          .withIndex("by_memeId", (q) => q.eq("memeId", meme._id))
          .collect();
        const commentCount = comments.filter((c) => !c.isDeleted).length;

        return {
          ...meme,
          reactionCounts,
          userReaction,
          commentCount,
          viewCount: meme.viewCount ?? 0,
        };
      }),
    );

    return {
      memes: memesWithMeta,
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

// Query to get adjacent memes (prev/next) for navigation using index range queries.
// "prev" = next newer meme (higher uploadedAt), "next" = next older meme (lower uploadedAt).
export const getAdjacentMemes = query({
  args: { shortId: v.string() },
  handler: async (ctx, args) => {
    const currentMeme = await ctx.db
      .query("memes")
      .withIndex("by_shortId", (q) => q.eq("shortId", args.shortId))
      .first();

    if (!currentMeme) return { prevShortId: null, nextShortId: null };

    // Previous in desc list = newer meme (higher uploadedAt)
    const prevMeme = await ctx.db
      .query("memes")
      .withIndex("by_uploadedAt", (q) =>
        q.gt("uploadedAt", currentMeme.uploadedAt),
      )
      .order("asc")
      .first();

    // Next in desc list = older meme (lower uploadedAt)
    const nextMeme = await ctx.db
      .query("memes")
      .withIndex("by_uploadedAt", (q) =>
        q.lt("uploadedAt", currentMeme.uploadedAt),
      )
      .order("desc")
      .first();

    return {
      prevShortId: prevMeme?.shortId ?? null,
      nextShortId: nextMeme?.shortId ?? null,
    };
  },
});

// Mutation to add a new meme (requires auth)
export const addMeme = mutation({
  args: {
    imageUrl: v.string(),
    imageUrls: v.optional(v.array(v.string())),
    description: v.string(),
    isNsfw: v.boolean(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.sessionToken);

    // Validate URLs point to Cloudinary
    validateCloudinaryUrl(args.imageUrl);
    if (args.imageUrls) {
      for (const url of args.imageUrls) {
        validateCloudinaryUrl(url);
      }
    }

    // Cap description length
    const description = args.description.slice(0, MAX_DESCRIPTION_LENGTH);
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
      imageUrls: args.imageUrls,
      description,
      isNsfw: args.isNsfw,
      uploadedAt: Date.now(),
      shortId: shortId,
    });
    return memeId;
  },
});
