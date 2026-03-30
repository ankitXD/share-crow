# Frontend Code Review — Share Crow

> Reviewed by: Senior Frontend Engineer  
> Date: March 30, 2026  
> Scope: All frontend code (app/, components/, hooks/, lib/), API routes, Convex functions

---

## Summary

| Severity                             | Count |
| ------------------------------------ | ----- |
| 🔴 Critical (Security)               | 6     |
| 🟠 Major (Bugs/Logic)                | 12    |
| 🟡 Minor (UX/A11y/Code Quality)      | 14    |
| 🔵 Informational (Performance/Style) | 8     |

---

## 🔴 Critical — Security Issues

### 1. Admin Convex functions have zero authentication

**Files:** `convex/admin.ts`

All admin mutations and queries (`getAdminOverview`, `getAllMemesWithStats`, `updateMeme`, `deleteMeme`, `adminDeleteComment`) have **no server-side auth checks**. The auth gate exists only as a client-side React check in `app/admin/page.tsx`. Any user can call these Convex functions directly via the Convex client or HTTP API.

```ts
// convex/admin.ts — no auth check at all
export const deleteMeme = mutation({
  args: { memeId: v.id("memes") },
  handler: async (ctx, args) => {
    // Anyone can delete any meme!
    await ctx.db.delete(args.memeId);
  },
});
```

**Fix:** Add session/token validation inside every admin Convex function.

---

### 2. `getUserByEmailInternal` exposes password hashes

**File:** `convex/users.ts`

This is a public Convex `query` that returns the full user document, including `passwordHash`. Any client can call it.

```ts
export const getUserByEmailInternal = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Returns passwordHash to any caller
    return await ctx.db.query("users").withIndex("by_email", ...).first();
  },
});
```

**Fix:** Use an `internalQuery` instead of `query` so it's not callable from clients. Or strip sensitive fields before returning.

---

### 3. Comment fingerprints exposed to all clients

**File:** `convex/comments.ts` → `getCommentsForMeme`

The query returns `fingerprint` for every comment. This allows any user to correlate anonymous identities across memes, de-anonymizing users.

```ts
return comments.map((c) => ({
  _id: c._id,
  fingerprint: c.fingerprint, // ← Leaked to all clients
  ...
}));
```

**Fix:** Only return `isOwn: c.fingerprint === requestFingerprint` instead of the raw fingerprint.

---

### 4. Upload route lacks file type/size validation

**File:** `app/api/upload/route.ts`

The upload endpoint checks that files exist and limits count to 10, but:

- Never validates MIME type (any file type can be uploaded)
- No file size limit (an attacker can upload very large files)
- Relies entirely on Cloudinary's `resource_type: "image"` which may not reject all malicious content

```ts
const filesToUpload = files.length > 0 ? files : singleFile ? [singleFile] : [];
// No MIME validation, no size check
```

**Fix:** Validate MIME type against an allowlist (`image/jpeg`, `image/png`, `image/gif`, `image/webp`) and enforce a max file size (e.g. 10MB) before uploading.

---

### 5. No rate limiting on auth endpoints

**File:** `app/api/auth/[...all]/route.ts`

Sign-in and sign-up endpoints have no rate limiting. An attacker can brute-force passwords via unlimited sign-in attempts.

**Fix:** Add rate limiting (e.g. per-IP throttle via middleware or an edge function).

---

### 6. `handleShare` — clipboard API without try/catch

**Files:** `components/meme-card.tsx`, `app/meme/[shortId]/meme-client.tsx`

`navigator.clipboard.writeText()` can throw if the browser denies permission or the API is unavailable (e.g. non-HTTPS, iframe context). The share handler in `meme-client.tsx` has no error handling:

```ts
const handleShare = async () => {
  const url = window.location.href;
  await navigator.clipboard.writeText(url); // Can throw
  toast("Link Copied");
};
```

**Fix:** Wrap in try/catch and fall back to a manual copy mechanism or show an error toast.

---

## 🟠 Major — Bugs & Logic Errors

### 7. `comment-section.tsx` — Fingerprint read during render causes hydration mismatch

**File:** `components/comment-section.tsx`

```ts
const fingerprint = typeof window !== "undefined" ? getFingerprint() : "";
```

This reads from `localStorage` during render. On the server, it returns `""`. On the client, it returns a UUID. This creates a React hydration mismatch. The fingerprint should be in a `useState` + `useEffect` pattern (like `home-content.tsx` and `meme-client.tsx` already do).

---

### 8. Upload page — Object URL memory leak

**File:** `app/upload/page.tsx`

```ts
useEffect(() => {
  return () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

The cleanup captures the initial empty `images` array (stale closure). When the component unmounts, it revokes URLs from the initial render — not the current ones. URLs created after mount are **never cleaned up**.

**Fix:** Use a ref to track current images, or remove the empty deps and handle in `removeImage`/`clearAll` only.

---

### 9. `reaction-bar.tsx` — Debounce timeout not cleared on unmount

**File:** `components/reaction-bar.tsx`

```ts
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
// No cleanup on unmount
```

If the component unmounts within the 300ms debounce window, the `toggleReaction` mutation fires after unmount, potentially causing errors.

**Fix:** Add a cleanup effect: `useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);`

---

### 10. `home-content.tsx` — Page navigation uses wrong variable

**File:** `app/home-content.tsx`

```ts
const goToNextPage = () => {
  if (currentPage < totalPages) {
    const newPage = page + 1; // Uses `page` from URL
  }
};
```

`page` comes from URL params, `currentPage` from the API. They can diverge (e.g. if URL says page 999 but only 5 pages exist, the API clamps `currentPage` to 5 but `page` is still 999). Next click would navigate to page 1000.

**Fix:** Use `currentPage` consistently for navigation calculations.

---

### 11. `home-content.tsx` — Page input has no debounce

**File:** `app/home-content.tsx`

```ts
onChange={(e) => {
  const newPage = Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1));
  handlePageChange(newPage);
}}
```

Every keystroke triggers `router.push()`. Typing "12" navigates to page 1 first, then page 12. Each push triggers a Convex query.

**Fix:** Debounce the input or use a form submission pattern.

---

### 12. `app/page.tsx` — Suspense wrapping is ineffective

**File:** `app/page.tsx`

The page is a client component (`"use client"`) with `<Suspense>` wrapping `<HomeContent>`. Suspense boundaries for data fetching require either React Server Components or throwing promises (React `use` hook). The `useQuery` from Convex returns `undefined` while loading — it doesn't throw, so Suspense never triggers. The loading spinner inside Suspense is dead code.

**Fix:** Either remove the Suspense boundary (since `HomeContent` handles its own loading state), or make the page a server component and use RSC streaming.

---

### 13. `meme-client.tsx` — `notFound()` in client component

**File:** `app/meme/[shortId]/meme-client.tsx`

```ts
if (!meme) {
  notFound();
}
```

`notFound()` from `next/navigation` throws a `NEXT_NOT_FOUND` error. While it works in client components, it can cause flash-of-content issues (the loading spinner shows, then the not-found page). Server-side 404 handling would be cleaner.

---

### 14. `convex-provider.tsx` — No runtime check for missing env var

**File:** `components/convex-provider.tsx`

```ts
const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string,
);
```

If `NEXT_PUBLIC_CONVEX_URL` is undefined (forgotten in `.env`), this silently passes `undefined` as a string. The ConvexReactClient will crash with an unhelpful error later.

**Fix:** Add a runtime guard: `if (!process.env.NEXT_PUBLIC_CONVEX_URL) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");`

---

### 15. `admin/page.tsx` — Unsafe double type casting

**File:** `app/admin/page.tsx`

```ts
<MemeTable
  memes={allMemes as unknown as MemeWithStats[]}
  ...
/>
```

Casting through `unknown` discards all type safety. If the Convex return type changes (e.g. a field is renamed), TypeScript won't catch it.

**Fix:** Define a proper type or use the type returned by Convex directly.

---

### 16. `meme-card.tsx` — Nested interactive elements inside `<Link>`

**File:** `components/meme-card.tsx`

The entire card is wrapped in `<Link href={...}>` (renders as `<a>`), but contains `<Button>`, `<button>`, and `ReactionBar` (which has buttons) inside. This creates:

- Invalid HTML (`<button>` inside `<a>`)
- Accessibility violations (nested interactive elements confuse screen readers)
- Click handler conflicts (despite `e.stopPropagation()`)

**Fix:** Remove the outer `<Link>` and make the card itself clickable via `onClick` + `router.push()`, or restructure to avoid nesting.

---

### 17. `home-content.tsx` — Unused `Upload` import

**File:** `app/home-content.tsx`

```ts
import { Upload, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
```

`Upload` is imported but only used in the empty-state block where it's rendered inside a `<Link>` to the upload page. On closer inspection it IS used — false alarm on this one, but the `Upload` in the empty state duplicates the one in `page.tsx` header.

---

### 18. `upload/page.tsx` — Emoji spinner instead of proper loading indicator

**File:** `app/upload/page.tsx`

```tsx
{isUploading ? (
  <>
    <span className="animate-spin mr-2">⏳</span>
    Uploading...
  </>
) : ...}
```

The ⏳ emoji doesn't spin visually in most browsers (it's not a symmetric glyph). The codebase already imports and uses `Loader2` from lucide for this purpose elsewhere.

---

## 🟡 Minor — UX, Accessibility & Code Quality

### 19. `not-found.tsx` — Both CTA buttons link to the same page

**File:** `app/not-found.tsx`

```tsx
<Link href="/">
  <Button size="lg">Back to Home</Button>
</Link>
<Link href="/">
  <Button size="lg" variant="outline">Browse Memes</Button>
</Link>
```

Both buttons navigate to `/`. One is redundant.

---

### 20. `not-found.tsx` — ASCII cow art with crow text

**File:** `app/not-found.tsx`

The ASCII art displays a cow (classic Perl cowsay format) but the caption says "The crow that got away..." — mixed metaphor for a project called "Share Crow".

---

### 21. Duplicated `formatCount` utility

**Files:** `components/meme-card.tsx`, `app/meme/[shortId]/meme-client.tsx`

Identical function defined in two files:

```ts
function formatCount(n: number): string {
  if (n >= 1000)
    return Intl.NumberFormat("en", { notation: "compact" }).format(n);
  return String(n);
}
```

**Fix:** Extract to `lib/utils.ts` and import.

---

### 22. Duplicated `timeAgo` utility

**Files:** `components/comment-section.tsx`, `components/admin/meme-detail-drawer.tsx`

Same `timeAgo` function copy-pasted.

**Fix:** Extract to a shared utility.

---

### 23. Duplicated `REACTION_EMOJIS` constant

**Files:** `lib/reactions.ts`, `components/reaction-bar.tsx`

`reaction-bar.tsx` defines its own local `REACTION_EMOJIS` instead of importing from `lib/reactions.ts`.

---

### 24. `use-mobile.ts` — Initial value causes layout shift

**File:** `hooks/use-mobile.ts`

```ts
const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
// ...
return !!isMobile; // undefined → false on first render
```

On SSR/first render, `!!undefined` returns `false` (desktop layout). If the user is on mobile, the layout snaps after hydration. Could cause CLS (Cumulative Layout Shift).

---

### 25. No `autoComplete` attributes on login form

**File:** `app/login/page.tsx`

Email and password inputs lack `autoComplete` attributes (`autoComplete="email"`, `autoComplete="current-password"` / `autoComplete="new-password"`). Password managers won't auto-fill correctly.

---

### 26. No confirmation dialog for comment deletion

**File:** `components/comment-section.tsx`

`handleDelete` immediately deletes the comment with no confirmation. Accidental taps on the small trash icon (3.5px) delete content permanently.

---

### 27. Missing `aria-label` on reaction emoji buttons

**File:** `components/reaction-bar.tsx`

Reaction buttons only show emoji text. Screen readers will read the emoji Unicode name (e.g. "face with tears of joy") which is inconsistent. Should have explicit `aria-label` like `"React with 😂 (3)"`.

---

### 28. No `alt` text for admin table thumbnails

**File:** `components/admin/meme-table.tsx`

```tsx
<img src={meme.imageUrl} alt="" className="size-10 rounded object-cover" />
```

`alt=""` marks these as decorative, but they're content images in a data table. Should at least have `alt={meme.description}`.

---

### 29. Multiple `eslint-disable` for `no-img-element`

**Files:** `meme-card.tsx`, `image-carousel.tsx`, `admin/edit-meme-dialog.tsx`, `admin/delete-meme-dialog.tsx`, `admin/meme-detail-drawer.tsx`, `admin/meme-table.tsx`

Six files disable the Next.js `no-img-element` rule to use raw `<img>` tags instead of `next/image`. This bypasses image optimization (lazy loading, sizing, WebP conversion, CDN). Given images come from Cloudinary, you could use `next/image` with the Cloudinary loader for significant perf gains.

---

### 30. `login/page.tsx` — Sign-up toggle only visible in dev mode

**File:** `app/login/page.tsx`

```ts
const isDev = process.env.NODE_ENV === "development";
// ...
{isDev && (
  <div>Already have an account? / Don't have an account?</div>
)}
```

This is intentional (sign-up disabled on prod), but there's no visual indication to a production user that sign-up is unavailable. They just see a sign-in form with no explanation.

---

### 31. `image-carousel.tsx` — Array index used as key

**File:** `components/image-carousel.tsx`

```tsx
{images.map((url, i) => (
  <CarouselItem key={i}>
```

Using array index as `key` is an anti-pattern when the list can be reordered (which it can, on the upload page via drag-and-drop).

**Fix:** Use the image URL as key: `key={url}`.

---

### 32. `comment-section.tsx` — `name` state not persisted

**File:** `components/comment-section.tsx`

Users must re-type their name every time they visit a meme page. Since the app uses fingerprints via `localStorage`, the display name could also be stored in `localStorage`.

---

## 🔵 Informational — Performance & Architecture

### 33. Pagination fetches entire memes table

**File:** `convex/memes.ts` → `getMemesWithPagination`

```ts
const allMemes = await ctx.db
  .query("memes")
  .withIndex("by_uploadedAt")
  .order("desc")
  .collect();
const memes = allMemes.slice(skip, skip + PAGE_SIZE);
```

Loads all memes into memory, then slices. This is O(n) regardless of page size and will degrade as the meme count grows. Convex supports cursor-based `.paginate()`.

---

### 34. `getAdjacentMemes` fetches all memes

**File:** `convex/memes.ts` → `getAdjacentMemes`

Same issue — loads every meme just to find the prev/next. Could use indexed queries with range filters.

---

### 35. `getAdminOverview` scans all tables

**File:** `convex/admin.ts`

```ts
const allMemes = await ctx.db.query("memes").collect();
const allReactions = await ctx.db.query("reactions").collect();
const allComments = await ctx.db.query("comments").collect();
```

Loads every document in three tables into memory to count them. This will time out or OOM as data grows.

---

### 36. New `ConvexHttpClient` created per request

**Files:** `app/meme/[shortId]/page.tsx`, `app/api/og/[shortId]/route.tsx`

```ts
const convex = new ConvexHttpClient(convexUrl);
```

A new client instance is created on every request. While lightweight, it skips connection reuse. The memes API route (`app/api/memes/[shortId]/route.ts`) correctly creates the client at module scope.

---

### 37. No image optimization via `next/image`

Multiple components use raw `<img>` tags for Cloudinary images. `next/image` with the Cloudinary remote pattern (already configured in `next.config.ts`) would provide:

- Automatic lazy loading
- Responsive `srcset`
- WebP/AVIF format negotiation
- Blur placeholders

---

### 38. Expired sessions never cleaned up

**File:** `convex/users.ts`

`getSessionByToken` returns `null` for expired sessions but never deletes them. Over time, the `sessions` table accumulates stale records.

**Fix:** Add a scheduled Convex function (cron) to purge expired sessions, or delete on read when found expired.

---

### 39. No error boundary

No React error boundary exists in the component tree. If any client component throws (e.g., Convex connection failure), the entire page crashes with a white screen.

**Fix:** Add an `error.tsx` file in the app directory or wrap key sections with an error boundary component.

---

### 40. `compressImage` has no error handling

**File:** `app/upload/page.tsx`

```ts
async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file); // Can throw on corrupt files
  const ctx = canvas.getContext("2d")!; // Non-null assertion
  // ...
}
```

If `createImageBitmap` fails (corrupt file) or `getContext` returns null (rare but possible), the function throws an unhandled error that bubbles up and breaks the upload.

---

## Prioritized Fix Order

1. **Add auth to Convex admin functions** (#1) — anyone can delete all memes right now
2. **Make `getUserByEmailInternal` internal** (#2) — password hashes are publicly queryable
3. **Stop leaking fingerprints in comments** (#3)
4. **Add file type/size validation on upload** (#4)
5. **Fix hydration mismatch in comment-section** (#7)
6. **Fix object URL memory leak in upload** (#8)
7. **Fix nested interactive elements in meme-card** (#16)
8. **Add error boundaries** (#39)
9. **Fix pagination to use cursor-based approach** (#33)
10. **Add clipboard error handling** (#6)
