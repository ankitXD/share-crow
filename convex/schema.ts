import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  memes: defineTable({
    imageUrl: v.string(),
    description: v.string(),
    uploadedAt: v.number(),
    isNsfw: v.optional(v.boolean()),
    shortId: v.string(),
    viewCount: v.optional(v.number()),
  })
    .index("by_uploadedAt", ["uploadedAt"])
    .index("by_shortId", ["shortId"]),

  users: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_token", ["token"]),

  reactions: defineTable({
    memeId: v.id("memes"),
    fingerprint: v.string(),
    emoji: v.string(),
    createdAt: v.number(),
  })
    .index("by_memeId", ["memeId"])
    .index("by_memeId_fingerprint", ["memeId", "fingerprint"]),

  memeViews: defineTable({
    memeId: v.id("memes"),
    fingerprint: v.string(),
    viewedAt: v.number(),
  }).index("by_memeId_fingerprint", ["memeId", "fingerprint"]),

  comments: defineTable({
    memeId: v.id("memes"),
    fingerprint: v.string(),
    name: v.string(),
    text: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_memeId", ["memeId"])
    .index("by_memeId_createdAt", ["memeId", "createdAt"]),
});
