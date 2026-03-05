import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  memes: defineTable({
    imageUrl: v.string(),
    description: v.string(),
    uploadedAt: v.number(),
  }).index("by_uploadedAt", ["uploadedAt"]),
});
