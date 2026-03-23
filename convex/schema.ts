import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  memes: defineTable({
    imageUrl: v.string(),
    description: v.string(),
    uploadedAt: v.number(),
    isNsfw: v.optional(v.boolean()),
    shortId: v.string(),
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
});
