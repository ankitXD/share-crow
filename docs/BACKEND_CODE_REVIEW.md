# Backend Code Review — Share Crow

> Reviewed by: Senior Backend Engineer  
> Date: March 30, 2026  
> Scope: Convex functions (`convex/`), API routes (`app/api/`), server-side libs (`lib/`, `config/`), Next.js config

---

## Summary

| Severity                             | Count |
| ------------------------------------ | ----- |
| 🔴 Critical (Security)               | 5     |
| 🟠 Major (Bugs/Logic/Data Integrity) | 10    |
| 🟡 Minor (Code Quality/Robustness)   | 8     |
| 🔵 Informational (Performance/Arch)  | 7     |

---

## 🔴 Critical — Security Issues

### 1. `getUserByEmailInternal` — SERVER_SECRET compared via `===` (timing attack)

**File:** `convex/users.ts`

```ts
if (args.serverSecret === process.env.SERVER_SECRET) {
  return user; // returns passwordHash
}
```

String equality (`===`) is vulnerable to timing attacks — an attacker can measure response time differences to brute-force the secret character by character. Additionally, if `SERVER_SECRET` is unset (undefined), the comparison `undefined === undefined` is `true` when no `serverSecret` arg is passed (though Convex's validator requires it to be a string, so this specific bypass doesn't apply — but the env var being unset + an empty string arg would match if both are falsy).

**Fix:** Use `timingSafeEqual` from Node's `crypto` module (or Convex's equivalent) for secret comparison. Also fail-closed if `SERVER_SECRET` is not configured:

```ts
if (!process.env.SERVER_SECRET) throw new Error("Server misconfigured");
```

---

### 2. `createUser` mutation is publicly callable — anyone can create admin accounts

**File:** `convex/users.ts`

```ts
export const createUser = mutation({
  args: { email: v.string(), name: v.string(), passwordHash: v.string() },
  handler: async (ctx, args) => { ... }
});
```

This is a public `mutation`. While the sign-up API route blocks on Vercel (`process.env.VERCEL`), the Convex mutation itself is directly callable by **any** client. An attacker can call `api.users.createUser` via the Convex client with a pre-computed password hash to create an account, bypassing the sign-up restriction entirely. Since all authenticated users are implicitly admins, this is a full admin takeover.

**Fix:** Make this an `internalMutation` so only server-side code can invoke it. Call it from an `action` that validates a server secret, or use Convex's internal function mechanism.

---

### 3. `createSession` mutation is publicly callable — session forging

**File:** `convex/users.ts`

```ts
export const createSession = mutation({
  args: { userId: v.id("users"), token: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", { ... });
  },
});
```

Any client can call this mutation with any `userId` and a custom `token`/`expiresAt`. An attacker who knows (or guesses) a valid user ID can forge a session, then set the cookie themselves for full authenticated access.

**Fix:** Make `createSession` an `internalMutation`.

---

### 4. `deleteSession` mutation is publicly callable — session invalidation attack

**File:** `convex/users.ts`

```ts
export const deleteSession = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => { ... }
});
```

Any client can call this with any token string. If an attacker discovers or guesses a session token, they can invalidate it, logging out the admin. More critically, Convex mutation calls are visible in the network tab, so a token observed in transit could be used.

**Fix:** Make `deleteSession` an `internalMutation`, callable only from the sign-out API route.

---

### 5. Rate limiter is in-memory and non-persistent — trivially bypassable in serverless

**File:** `app/api/auth/[...all]/route.ts`

```ts
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
```

In a serverless environment (Vercel), each invocation may run in a different isolate. The `Map` is not shared across instances — attackers can brute-force by hitting different cold starts. Additionally:

- The rate limiter relies on `x-forwarded-for`, which can be spoofed unless the CDN strips and re-adds it (Vercel does, but other deployments might not).
- The `Map` grows unboundedly — no eviction/cleanup, potential memory leak on long-running instances.

**Fix:** Use a persistent rate-limiting store (Redis, Upstash, or Vercel KV). If in-memory is acceptable for the project scale, at least add a `Map` size cap and periodic cleanup.

---

## 🟠 Major — Bugs & Logic Errors

### 6. `recordView` has a race condition on `viewCount` increment

**File:** `convex/views.ts`

```ts
const meme = await ctx.db.get(args.memeId);
if (meme) {
  await ctx.db.patch(args.memeId, {
    viewCount: (meme.viewCount ?? 0) + 1,
  });
}
```

If two `recordView` calls execute concurrently for the same meme, both read the same `viewCount`, and one increment is lost (classic read-modify-write race). Convex mutations are serialized per-document, so this is mitigated in Convex specifically, but the pattern is fragile — if the code ever moves to a different backend, this will silently lose counts.

**Fix:** Document that this relies on Convex's serialization guarantee. If portability matters, use an atomic increment pattern.

---

### 7. `getAdminOverview` scans all documents in three tables

**File:** `convex/admin.ts`

```ts
const allMemes = await ctx.db.query("memes").collect();
const allReactions = await ctx.db.query("reactions").collect();
const allComments = await ctx.db.query("comments").collect();
```

This loads every document from `memes`, `reactions`, and `comments` into memory. At scale (10K+ memes, 100K+ reactions), this will hit Convex's execution time limits and memory caps. This query runs reactively — any mutation to any of these three tables triggers a full re-scan for every admin client.

**Fix:** Maintain a separate `stats` singleton document updated via mutations (event-driven counters), or use aggregation-optimized queries with pagination.

---

### 8. `getAllMemesWithStats` has N+1 query problem

**File:** `convex/admin.ts`

```ts
const memesWithStats = await Promise.all(
  allMemes.map(async (meme) => {
    const reactions = await ctx.db.query("reactions")...collect();
    const comments = await ctx.db.query("comments")...collect();
    return { ...meme, reactionCount, commentCount };
  }),
);
```

For N memes, this executes 2N additional queries (reactions + comments per meme). With 100 memes, that's 200 extra queries per invocation. Combined with `.collect()` on all memes, this is extremely expensive.

**Fix:** Batch-fetch reactions and comments in two queries (all reactions, all comments), then group in memory. Or denormalize counts onto the meme document.

---

### 9. `getMemesWithPagination` — Same N+1 and full-table-scan issue

**File:** `convex/memes.ts`

```ts
const allMemes = await ctx.db.query("memes")...collect();
const memes = allMemes.slice(skip, skip + PAGE_SIZE);
```

Loads all memes then slices. Even though only 6 are shown, every meme is fetched. Then for each of the 6 memes, reactions and comments are fetched individually. This runs on every page navigation.

**Fix:** Use Convex's `.paginate()` method with cursors instead of offset-based slicing. For the joins, pre-aggregate counts on the meme document.

---

### 10. `getAdjacentMemes` loads entire memes table

**File:** `convex/memes.ts`

```ts
const allMemes = await ctx.db.query("memes")...collect();
const currentIndex = allMemes.findIndex((m) => m.shortId === args.shortId);
```

Every call to get prev/next meme loads all memes. This is called on every meme detail page load.

**Fix:** Use the `uploadedAt` timestamp of the current meme as a range boundary. Query one meme with `uploadedAt > current` (next) and one with `uploadedAt < current` (prev) using the `by_uploadedAt` index.

---

### 11. `deleteMeme` cascade delete is not atomic

**File:** `convex/admin.ts`

```ts
for (const r of reactions) await ctx.db.delete(r._id);
for (const vi of views) await ctx.db.delete(vi._id);
for (const c of comments) await ctx.db.delete(c._id);
await ctx.db.delete(args.memeId);
```

If the mutation times out mid-cascade (Convex has execution time limits), you end up with orphaned records or a partially deleted meme. With hundreds of reactions/views/comments, the sequential deletes could hit the limit.

**Fix:** For large cascades, use a Convex `action` that batches deletions across multiple mutation calls, or use a scheduled function pattern to clean up in chunks.

---

### 12. `cleanupExpiredSessions` scans all sessions without an index

**File:** `convex/users.ts`

```ts
const sessions = await ctx.db.query("sessions").collect();
for (const session of sessions) {
  if (session.expiresAt < now) {
    await ctx.db.delete(session._id);
  }
}
```

No index on `expiresAt` means a full table scan. The sequential delete loop will be slow with many sessions. Also, this mutation is never actually called anywhere — there's no cron job or trigger to invoke it.

**Fix:** Add an index on `expiresAt` to the sessions table. Set up a Convex cron job to call this periodically. Consider batch deletion instead of one-by-one.

---

### 13. `handleSignOut` doesn't validate the session before deleting

**File:** `app/api/auth/[...all]/route.ts`

```ts
async function handleSignOut(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await convexClient.mutation(api.users.deleteSession, { token });
  }
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}
```

Sign-out always returns `{ success: true }` even if the token was invalid, already expired, or didn't exist. While not a bug per se, it means there's no feedback if something went wrong. More importantly, there's no CSRF protection on this endpoint — a malicious page could trigger sign-out via a form POST.

**Fix:** Add CSRF protection (e.g., validate the `Origin`/`Referer` header or use a CSRF token).

---

### 14. `handleGetSession` returns the session token to the client

**File:** `app/api/auth/[...all]/route.ts`

```ts
return NextResponse.json({ session: { ...result, token } });
```

The session token is spread into the response JSON. This token is the same one stored in the HttpOnly cookie. Returning it in a JSON body defeats the purpose of HttpOnly — any XSS can now read the token from the API response instead of the cookie.

**Fix:** Remove `token` from the session response. The client doesn't need it — the cookie handles auth.

---

### 15. `addMeme` mutation has no auth check

**File:** `convex/memes.ts`

```ts
export const addMeme = mutation({
  args: { imageUrl: v.string(), imageUrls: v.optional(v.array(v.string())), description: v.string(), isNsfw: v.boolean() },
  handler: async (ctx, args) => { ... }
});
```

The upload API route (`app/api/upload/route.ts`) checks auth, but the `addMeme` Convex mutation is public. An attacker can call `api.memes.addMeme` directly with any `imageUrl` (including malicious URLs), bypassing the upload route entirely. They can inject arbitrary image URLs that don't come from Cloudinary.

**Fix:** Either make `addMeme` an `internalMutation`, or add session token validation within the mutation. Also validate that `imageUrl` matches the expected Cloudinary URL pattern.

---

## 🟡 Minor — Code Quality & Robustness

### 16. `convex-server.ts` — Non-null assertion on env var

**File:** `lib/convex-server.ts`

```ts
export const convexClient = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!,
);
```

If the env var is missing, this silently creates a client with `undefined` as the URL. It will fail later with an unhelpful error.

**Fix:** Add a guard: `if (!process.env.NEXT_PUBLIC_CONVEX_URL) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");`

---

### 17. `memes/[shortId]/route.ts` — Inconsistent ConvexHttpClient instantiation

**File:** `app/api/memes/[shortId]/route.ts`

```ts
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  /* handled in GET */
}
const convex = new ConvexHttpClient(convexUrl || "");
```

Creates a client with an empty string if the URL is missing, deferring the error. This is at module scope, so every request through this route constructs the client correctly — but the empty string fallback is misleading. The other routes use `convexClient` from `lib/convex-server.ts`, while this one creates its own. Inconsistent.

**Fix:** Import `convexClient` from `lib/convex-server.ts` like the other routes.

---

### 18. Auth route — `request.json()` can throw on invalid body

**File:** `app/api/auth/[...all]/route.ts`

```ts
const { email, password, name } = await request.json();
```

If the request body is not valid JSON (e.g., empty body, wrong content-type), `request.json()` throws an unhandled error that results in a 500 with the raw error message.

**Fix:** Wrap in try/catch and return a 400 for malformed requests.

---

### 19. `og/[shortId]/route.tsx` — Non-null assertion on env var, no fallback

**File:** `app/api/og/[shortId]/route.tsx`

```ts
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
```

Edge runtime. If the env var is missing, this crashes at module initialization. Unlike the memes route, there's no deferred check.

**Fix:** Same as #16 — add a runtime guard.

---

### 20. HTML sanitization in comments is regex-based

**File:** `convex/comments.ts`

```ts
function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/<[^>]*>/g, "")
    .slice(0, 500);
}
```

The regex `/<[^>]*>/g` is a naive HTML stripper. It fails on edge cases:

- `<script>alert(1)</script` (unclosed tag — the `>` inside `script` isn't matched)
- `<<script>alert(1)` (nested angle brackets)
- HTML entities like `&lt;script&gt;` pass through and could be rendered as HTML downstream

For a text-only field stored in a database and rendered via React (which escapes by default), the risk is low. But if these comments are ever rendered with `dangerouslySetInnerHTML` or in an email template, it's an XSS vector.

**Fix:** Use a proper sanitizer library (e.g., `sanitize-html` or `DOMPurify` server-side), or at minimum document that comments must always be rendered via React's default escaping.

---

### 21. `addMeme` — `imageUrl` and `imageUrls` accept arbitrary URLs

**File:** `convex/memes.ts`

```ts
args: {
  imageUrl: v.string(),
  imageUrls: v.optional(v.array(v.string())),
  description: v.string(),
  isNsfw: v.boolean(),
},
```

No validation that URLs point to Cloudinary. An attacker could store `javascript:`, `data:`, or phishing URLs that get rendered in `<img>` tags or opened by users sharing links.

**Fix:** Validate that URLs match `https://res.cloudinary.com/` prefix before storing.

---

### 22. `description` field has no length limit in the Convex schema

**Files:** `convex/memes.ts`, `convex/admin.ts`

The meme `description` is `v.string()` with no max length. An attacker can store megabytes of text in the description field via the public `addMeme` mutation.

**Fix:** Add `.slice(0, 500)` or similar length cap in the mutation handler.

---

### 23. Cloudinary config warns but doesn't fail on missing credentials

**File:** `config/cloudinary.ts`

```ts
if (!process.env.CLOUDINARY_API_KEY) {
  console.warn("⚠️ CLOUDINARY_API_KEY is not set");
}
```

Warnings are logged but the module still exports the unconfigured client. Any upload will fail with a cryptic Cloudinary error instead of an early, clear failure.

**Fix:** Throw during module init if required keys are missing (at least in production).

---

## 🔵 Informational — Performance & Architecture

### 24. No middleware for route protection

There's no `middleware.ts` file. Route protection for `/admin` and `/upload` is done client-side. A malicious user can directly access these pages' API interactions without the client-side guard. While Convex admin functions now check `sessionToken`, the absence of middleware means:

- Every protected API route must independently verify auth
- No centralized CORS, security headers, or request logging

**Fix:** Add Next.js middleware for auth verification, security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`), and optionally CORS.

---

### 25. No request logging or error tracking

**Files:** All API routes

Errors are logged to `console.error` with no structured format, request ID, or correlation. In production on Vercel, these logs are ephemeral and hard to search. There's no error tracking service (Sentry, LogRocket, etc.).

**Fix:** Add structured logging (request ID, timestamp, user context) and integrate an error tracking service.

---

### 26. `getCommentsForMeme` fetches all comments then filters

**File:** `convex/comments.ts`

```ts
const comments = await ctx.db.query("comments")...collect();
return comments.filter((c) => !c.isDeleted);
```

Soft-deleted comments are still fetched from the database and filtered in memory. As deleted comments accumulate, this becomes increasingly wasteful. There's no index on `isDeleted`.

**Fix:** Either hard-delete comments (current admin delete already does), or add a composite index that includes `isDeleted` for efficient filtering.

---

### 27. `getReactionsSummary` — unbounded batch query

**File:** `convex/reactions.ts`

```ts
args: { memeIds: v.array(v.id("memes")), ... },
handler: async (ctx, args) => {
  for (const memeId of args.memeIds) {
    const reactions = await ctx.db.query("reactions")...collect();
    ...
  }
}
```

`memeIds` array has no size limit. A client could pass thousands of IDs, causing the function to execute thousands of queries in a single invocation and potentially timing out.

**Fix:** Cap the array size (e.g., `v.array(v.id("memes"), { maxLength: 50 })`), or validate length in the handler.

---

### 28. Upload route processes files sequentially

**File:** `app/api/upload/route.ts`

```ts
for (const file of filesToUpload) {
  const url = await uploadFile(file);
  urls.push(url);
}
```

Files are uploaded to Cloudinary one at a time. For a 10-image upload, each Cloudinary upload takes ~1-3 seconds, resulting in 10-30 seconds of request time.

**Fix:** Use `Promise.all` (or `Promise.allSettled` for partial failure handling) to upload files in parallel:

```ts
const urls = await Promise.all(filesToUpload.map(uploadFile));
```

---

### 29. No Cloudinary image cleanup on meme deletion

**File:** `convex/admin.ts`

```ts
// Note: Cloudinary image cleanup should be handled via a separate action
await ctx.db.delete(args.memeId);
```

The code acknowledges the gap with a comment but doesn't implement it. Deleted memes leave orphaned images in Cloudinary, accumulating storage costs.

**Fix:** Implement a Convex action or scheduled function that calls the Cloudinary destroy API after meme deletion.

---

### 30. `getMemeByShortId` — No validation on `shortId` format

**File:** `convex/memes.ts`

```ts
args: { shortId: v.string() },
```

Accepts any string. The shortId is expected to be 7 characters of Base62. Passing a very long string or special characters wastes an index lookup.

**Fix:** Validate format: `if (!/^[0-9a-zA-Z]{7}$/.test(args.shortId)) return null;`

---

## Prioritized Fix Order

1. **Make `createUser`/`createSession`/`deleteSession` internal mutations** (#2, #3, #4) — direct admin takeover vector
2. **Make `addMeme` internal or add auth** (#15) — arbitrary content injection
3. **Fix `getUserByEmailInternal` secret comparison** (#1) — timing attack on server secret
4. **Remove session token from API response** (#14) — defeats HttpOnly cookie security
5. **Add URL validation on meme image URLs** (#21) — prevents stored XSS/phishing vectors
6. **Add CSRF protection on auth endpoints** (#13) — session manipulation
7. **Persistent rate limiting** (#5) — brute-force protection
8. **Fix N+1 queries in pagination/admin** (#8, #9) — performance at scale
9. **Use cursor-based pagination** (#9, #10) — O(n) → O(1) page loads
10. **Add middleware for security headers** (#24) — defense in depth
