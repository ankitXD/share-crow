# Feature Plan: Reactions, Views & Comments

## Current Architecture Summary

| Layer       | Tech                       | Key Detail                                                     |
| ----------- | -------------------------- | -------------------------------------------------------------- |
| Database    | Convex                     | 3 tables: `memes`, `users`, `sessions`                         |
| Auth        | Custom cookie-based        | scrypt hashing, HttpOnly `session_token` cookie, 30-day expiry |
| Client data | `useQuery` / `useMutation` | Real-time reactivity built-in                                  |
| Server data | `ConvexHttpClient`         | Used in API routes & `generateMetadata`                        |
| UI          | shadcn/ui + Tailwind       | Dark-only theme, Sonner toasts                                 |

**Important constraint:** Sign-up is disabled on production. This means most visitors are **anonymous/unauthenticated**. The feature design must account for this.

---

## 1. Reactions

### 1.1 Schema Changes (`convex/schema.ts`)

Add a `reactions` table:

```ts
reactions: defineTable({
  memeId: v.id("memes"),
  userId: v.optional(v.id("users")), // null for anonymous
  sessionFingerprint: v.optional(v.string()), // fallback for anonymous users
  emoji: v.string(), // e.g. "😂", "🔥", "💀", "❤️", "👎"
  createdAt: v.number(),
})
  .index("by_memeId", ["memeId"])
  .index("by_memeId_userId", ["memeId", "userId"])
  .index("by_memeId_fingerprint", ["memeId", "sessionFingerprint"]);
```

**Why this design:**

- Separate table (not embedded in memes) — scales better, avoids document bloat, enables real-time granularity.
- `userId` for authenticated users, `sessionFingerprint` (localStorage-based UUID) for anonymous users — prevents duplicate reactions without forcing login.
- `emoji` as string — extensible to any emoji set, not locked to like/dislike.

### 1.2 Allowed Emoji Set

Predefined set of 5-6 emojis to keep UI clean:

```ts
// lib/reactions.ts
export const REACTION_EMOJIS = ["😂", "🔥", "💀", "❤️", "👎", "😮"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
```

### 1.3 Convex Functions (`convex/reactions.ts`)

| Function              | Type     | Purpose                                                                                                                                                                                                |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `toggleReaction`      | mutation | Add or remove a reaction (toggle behavior). Accepts `memeId`, `emoji`, and either `userId` or `sessionFingerprint`. Checks for existing reaction → removes if same emoji, replaces if different emoji. |
| `getReactionsForMeme` | query    | Returns aggregated counts per emoji + whether current user has reacted. e.g. `{ "😂": 5, "🔥": 3 }` and `userReaction: "😂"`                                                                           |
| `getReactionsSummary` | query    | Batch query for meme list page — accepts array of meme IDs, returns map of `{ memeId: { counts, userReaction } }`. Avoids N+1 queries on the home grid.                                                |

**Toggle logic:**

```
if (existing reaction with same emoji) → delete it (un-react)
if (existing reaction with different emoji) → update to new emoji
if (no existing reaction) → insert new reaction
```

### 1.4 Client-Side Implementation

**Anonymous fingerprint:**

```ts
// lib/fingerprint.ts
export function getFingerprint(): string {
  let fp = localStorage.getItem("sc_fingerprint");
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem("sc_fingerprint", fp);
  }
  return fp;
}
```

**Hook:**

```ts
// hooks/use-reactions.ts
// Wraps useQuery(api.reactions.getReactionsForMeme) and useMutation(api.reactions.toggleReaction)
// Returns { counts, userReaction, toggle }
```

### 1.5 UI Changes

**Meme Card (`components/meme-card.tsx`):**

- Add a row of emoji buttons below the description, before download/share buttons.
- Each emoji shows its count (if > 0).
- Highlight the user's current reaction.
- Clicking an already-selected emoji un-reacts (toggle).
- Clicking fires `toggleReaction` mutation — Convex real-time updates all viewers instantly.

```
┌──────────────────────────────┐
│         [Meme Image]         │
│                              │
│  "Some meme description..."  │
│                              │
│  😂 12  🔥 5  💀 3  ❤️ 8    │  ← reaction bar
│                              │
│          [Download] [Share]  │
└──────────────────────────────┘
```

**Meme Detail (`app/meme/[shortId]/meme-client.tsx`):**

- Larger reaction bar below the image/description.
- Same toggle behavior.

### 1.6 Rate Limiting

Add a simple client-side debounce (300ms) on the toggle mutation to prevent spam-clicking. On the Convex side, the toggle mutation naturally prevents duplicates via the upsert logic.

---

## 2. Views

### 2.1 Approach: Denormalized Counter + View Log

Two options considered:

| Approach                              | Pros                                | Cons                                 |
| ------------------------------------- | ----------------------------------- | ------------------------------------ |
| **A) Separate `views` table**         | Accurate unique tracking, queryable | More writes, heavier reads for count |
| **B) Counter field on `memes` table** | Fast reads, simple                  | Hard to deduplicate, no analytics    |
| **C) Hybrid (chosen)**                | Best of both                        | Slightly more complexity             |

**Chosen: Hybrid approach**

- Add `viewCount: v.number()` field directly on the `memes` table for fast display.
- Add a `memeViews` table for deduplication (tracks who viewed what in the last 24h).

### 2.2 Schema Changes

```ts
// Add to memes table definition:
memes: defineTable({
  // ...existing fields
  viewCount: v.optional(v.number()), // v.optional for backward compat with existing docs
});

// New table:
memeViews: defineTable({
  memeId: v.id("memes"),
  fingerprint: v.string(), // sessionFingerprint (same as reactions)
  viewedAt: v.number(),
}).index("by_memeId_fingerprint", ["memeId", "fingerprint"]);
```

### 2.3 Convex Functions (`convex/views.ts`)

| Function       | Type     | Purpose                                                                                                                                                                 |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recordView`   | mutation | Called when meme detail page loads. Checks `memeViews` for existing view by this fingerprint in last 24h. If none → inserts view record + increments `memes.viewCount`. |
| `getViewCount` | query    | Returns `viewCount` from meme doc (already available via existing `getMemeByShortId`).                                                                                  |

**Deduplication window:** 24 hours per fingerprint per meme. Same user visiting the same meme twice in 24h counts as 1 view.

### 2.4 Client-Side Implementation

**Where to fire:**

- `app/meme/[shortId]/meme-client.tsx` — fire `recordView` mutation inside a `useEffect` on mount.
- Pass `sessionFingerprint` from `getFingerprint()`.
- Do NOT fire views from the home grid (only detail page visits count).

```ts
useEffect(() => {
  if (meme) {
    recordView({ memeId: meme._id, fingerprint: getFingerprint() });
  }
}, [meme?._id]);
```

### 2.5 UI Changes

**Meme Card:**

- Add a small eye icon with view count in the card footer: `👁 1.2k`
- Use `Intl.NumberFormat` for compact display (1k, 1.2k, etc.)

**Meme Detail:**

- Show view count near the description.

### 2.6 Backfill

Existing memes won't have `viewCount`. Handle with `meme.viewCount ?? 0` everywhere. No migration needed thanks to `v.optional()`.

### 2.7 Cleanup (Optional, Future)

A scheduled Convex function (`crons`) to delete `memeViews` records older than 7 days to keep the table lean. Not needed for MVP.

---

## 3. Comments

### 3.1 Auth Decision

**Comments require authentication.** Unlike reactions/views, comments are user-generated content that needs accountability and moderation. Unauthenticated users see comments but can't post.

Since sign-up is disabled on production, comments will initially be admin-only (only the site owner posts). When sign-up is enabled, all users can comment.

### 3.2 Schema Changes (`convex/schema.ts`)

```ts
comments: defineTable({
  memeId: v.id("memes"),
  userId: v.id("users"),
  text: v.string(), // max 500 chars (validated in mutation)
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
  isDeleted: v.optional(v.boolean()), // soft delete for moderation
})
  .index("by_memeId", ["memeId"])
  .index("by_userId", ["userId"])
  .index("by_memeId_createdAt", ["memeId", "createdAt"]);
```

**Why soft delete:** Allows moderation without losing audit trail. Deleted comments show as "[deleted]".

### 3.3 Convex Functions (`convex/comments.ts`)

| Function             | Type     | Purpose                                                                                                                           |
| -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `addComment`         | mutation | Validates auth (session token), validates text (1-500 chars, trimmed), inserts comment.                                           |
| `getCommentsForMeme` | query    | Returns comments for a meme, ordered by `createdAt` desc, with user name joined. Filters out soft-deleted (or shows "[deleted]"). |
| `deleteComment`      | mutation | Soft-deletes a comment. Only the comment author or site admin can delete. Sets `isDeleted: true`.                                 |
| `editComment`        | mutation | Updates comment text. Only the author can edit. Sets `updatedAt`.                                                                 |
| `getCommentCount`    | query    | Returns count of non-deleted comments for a meme. Used on meme cards.                                                             |

### 3.4 Auth Validation in Mutations

Since auth is cookie-based and Convex mutations don't have access to cookies, we need to pass the session token:

**Option A (Simple — chosen for MVP):**

- Client reads `session_token` from a client-side session state (already available via `useSession()`).
- Pass `userId` to the mutation.
- Validate in the mutation that the user exists.

**Option B (More secure — future improvement):**

- Create an API route `/api/comments` that validates the cookie server-side, then calls Convex mutation via `ConvexHttpClient`.
- Better security but adds latency and loses real-time reactivity.

**Chosen: Option A for MVP** — the `useSession()` hook already provides the user ID. Pass it to Convex mutations. The mutation verifies the user exists in the DB.

### 3.5 Client-Side Implementation

**New component: `components/comment-section.tsx`**

```
┌─────────────────────────────────────┐
│  Comments (3)                       │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │ [avatar] UserName · 2h ago     ││
│  │ This meme is hilarious 😂      ││
│  │                    [Edit][Del]  ││  ← only for comment author
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ [avatar] AnotherUser · 5h ago  ││
│  │ Classic!                        ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ [Write a comment...]     [Post]││  ← only shown if authenticated
│  └─────────────────────────────────┘│
│                                     │
│  Sign in to comment                 │  ← shown if not authenticated
└─────────────────────────────────────┘
```

**Hook: `hooks/use-comments.ts`**

- Wraps `useQuery(api.comments.getCommentsForMeme)` and `useMutation(api.comments.addComment)`
- Provides `{ comments, addComment, deleteComment, editComment, isLoading }`

**Form validation:**

- Max 500 characters
- Trim whitespace
- No empty comments
- Client-side validation with visual character counter

### 3.6 UI Integration

**Meme Detail Page (`meme-client.tsx`):**

- Add `<CommentSection memeId={meme._id} />` below the download/share buttons.
- Real-time updates via Convex `useQuery`.

**Meme Card (`meme-card.tsx`):**

- Add comment count icon: `💬 3` next to the view count.
- Clicking navigates to the detail page (already does via the card link).

### 3.7 Input Sanitization

- Strip HTML tags from comment text in the mutation (prevent XSS).
- Render comments as plain text (no markdown/HTML rendering).
- Validate text length server-side in the Convex mutation.

---

## 4. Shared Infrastructure

### 4.1 Anonymous Fingerprint (`lib/fingerprint.ts`)

Shared by both Reactions and Views. Uses `crypto.randomUUID()` stored in localStorage.

```ts
// Used by: reactions (toggle), views (dedup)
// Key: "sc_fingerprint"
// Generated once, persists for the browser session
```

### 4.2 Updated Meme Card Props

```ts
interface MemeCardProps {
  shortId: string;
  imageUrl: string;
  description: string;
  isNsfw?: boolean;
  viewCount?: number; // NEW
  commentCount?: number; // NEW
  reactions?: ReactionSummary; // NEW
}
```

### 4.3 Home Page Data Loading

The home page currently fetches `getMemesWithPagination` which returns meme docs. To avoid N+1 queries:

**Approach:** Extend `getMemesWithPagination` to join reaction counts and comment counts inline. Convex allows this within a single query handler:

```ts
// In getMemesWithPagination handler:
const memesWithMeta = await Promise.all(
  memes.map(async (meme) => {
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_memeId", (q) => q.eq("memeId", meme._id))
      .collect();
    const commentCount = await ctx.db
      .query("comments")
      .withIndex("by_memeId", (q) => q.eq("memeId", meme._id))
      .collect();
    return {
      ...meme,
      reactionCounts: aggregateReactions(reactions),
      commentCount: commentCount.filter((c) => !c.isDeleted).length,
    };
  }),
);
```

This keeps it to a single `useQuery` call on the client for the entire grid.

---

## 5. Implementation Order

```
Phase 1: Views (simplest, no auth dependency)
├── 1a. Schema: add viewCount to memes, create memeViews table
├── 1b. Convex: recordView mutation
├── 1c. Client: useEffect in meme-client.tsx
├── 1d. UI: view count on meme card + detail page
│
Phase 2: Reactions (medium complexity, anonymous support)
├── 2a. Schema: create reactions table
├── 2b. Shared: fingerprint utility
├── 2c. Convex: toggleReaction mutation, getReactionsForMeme query
├── 2d. UI: reaction bar component
├── 2e. Integration: meme card + detail page
│
Phase 3: Comments (most complex, auth-gated)
├── 3a. Schema: create comments table
├── 3b. Convex: CRUD mutations + queries
├── 3c. UI: CommentSection component
├── 3d. Integration: meme detail page
├── 3e. Home page: comment count on cards
│
Phase 4: Polish
├── 4a. Extend getMemesWithPagination to join counts
├── 4b. Loading skeletons for new sections
├── 4c. Empty states ("No comments yet", "Be the first to react")
├── 4d. Mobile responsive adjustments
└── 4e. OG metadata: include reaction/view counts in description
```

---

## 6. File Changes Summary

| File                                 | Change                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `convex/schema.ts`                   | Add `reactions`, `memeViews`, `comments` tables. Add `viewCount` to `memes`.                   |
| `convex/reactions.ts`                | **New.** `toggleReaction`, `getReactionsForMeme`, `getReactionsSummary`                        |
| `convex/views.ts`                    | **New.** `recordView`                                                                          |
| `convex/comments.ts`                 | **New.** `addComment`, `getCommentsForMeme`, `deleteComment`, `editComment`, `getCommentCount` |
| `convex/memes.ts`                    | Extend `getMemesWithPagination` to join reaction counts, comment counts, view counts.          |
| `lib/fingerprint.ts`                 | **New.** `getFingerprint()` utility.                                                           |
| `lib/reactions.ts`                   | **New.** `REACTION_EMOJIS` constant + type.                                                    |
| `hooks/use-reactions.ts`             | **New.** Reaction hook.                                                                        |
| `hooks/use-comments.ts`              | **New.** Comment hook.                                                                         |
| `components/meme-card.tsx`           | Add reaction bar, view count, comment count.                                                   |
| `components/reaction-bar.tsx`        | **New.** Reusable emoji reaction row.                                                          |
| `components/comment-section.tsx`     | **New.** Comment list + form.                                                                  |
| `components/comment-item.tsx`        | **New.** Single comment with edit/delete.                                                      |
| `app/meme/[shortId]/meme-client.tsx` | Add reactions, view tracking, comments.                                                        |
| `app/home-content.tsx`               | Pass new props to MemeCard.                                                                    |

**Total: 8 new files, 6 modified files.**

---

## 7. Risks & Considerations

| Risk                                     | Mitigation                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Anonymous abuse** (reaction/view spam) | Fingerprint dedup + 24h view window. Consider rate limiting via Convex scheduled functions if needed.            |
| **Comment spam**                         | Auth-gated. Sign-up disabled on prod = only admin can comment initially.                                         |
| **Convex read costs**                    | Join counts in pagination query to avoid N+1. Use `viewCount` on meme doc (not counting views table).            |
| **Fingerprint clearing**                 | User clears localStorage → new fingerprint → duplicate reactions possible. Acceptable trade-off for no-login UX. |
| **Schema migration**                     | All new fields use `v.optional()`. Existing meme docs continue to work. No backfill script needed.               |
| **Real-time performance**                | Convex handles real-time subscriptions natively. Reaction/comment updates will auto-propagate to all viewers.    |
