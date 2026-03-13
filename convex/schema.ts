import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  memes: defineTable({
    imageUrl: v.string(),
    description: v.string(),
    uploadedAt: v.number(),
    isNsfw: v.optional(v.boolean()),
  }).index("by_uploadedAt", ["uploadedAt"]),
});
