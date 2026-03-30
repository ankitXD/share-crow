import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Constant-time string comparison to prevent timing attacks.
// Always compares full length regardless of where strings differ.
function timingSafeStringEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let result = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return result === 0;
}

function validateServerSecret(secret: string) {
  const expected = process.env.SERVER_SECRET;
  if (!expected) {
    throw new Error("Server misconfigured: SERVER_SECRET is not set");
  }
  if (!timingSafeStringEqual(secret, expected)) {
    throw new Error("Unauthorized: invalid server secret");
  }
}

// Protected mutation — requires server secret to prevent direct client calls.
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    validateServerSecret(args.serverSecret);

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("User with this email already exists");
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      passwordHash: args.passwordHash,
      createdAt: Date.now(),
    });

    return userId;
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Protected mutation — requires server secret to prevent direct client calls.
export const createSession = mutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    validateServerSecret(args.serverSecret);

    return await ctx.db.insert("sessions", {
      userId: args.userId,
      token: args.token,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
  },
});

export const getSessionByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) return null;
    if (session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user) return null;

    return {
      session,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
      },
    };
  },
});

// Protected mutation — requires server secret to prevent direct client calls.
export const deleteSession = mutation({
  args: { token: v.string(), serverSecret: v.string() },
  handler: async (ctx, args) => {
    validateServerSecret(args.serverSecret);

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

// Uses by_expiresAt index for efficient expired session lookup.
// Should be invoked via a Convex cron job.
export const cleanupExpiredSessions = mutation({
  args: { serverSecret: v.string() },
  handler: async (ctx, args) => {
    validateServerSecret(args.serverSecret);

    const now = Date.now();
    const expiredSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .collect();
    let deleted = 0;
    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
      deleted++;
    }
    return { deleted };
  },
});

// Query for server-side auth verification via ConvexHttpClient.
// Returns passwordHash only when a valid server secret is provided.
export const getUserByEmailInternal = query({
  args: { email: v.string(), serverSecret: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return null;

    // Fail-closed: if SERVER_SECRET is not configured, never return sensitive data
    const expected = process.env.SERVER_SECRET;
    if (
      expected &&
      args.serverSecret &&
      timingSafeStringEqual(args.serverSecret, expected)
    ) {
      return user;
    }
    // Strip sensitive data for unauthenticated callers
    return {
      _id: user._id,
      _creationTime: user._creationTime,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  },
});
