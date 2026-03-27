# Feature Plan: Multi-Image Memes (Carousel / Swipeable)

## Concept

Allow users to upload multiple images for a single meme post — similar to Instagram/Facebook carousels. Viewers can swipe through images on mobile or click arrows on desktop. A single meme post can contain 1–10 images.

---

## 1. User Flow

### 1.1 Upload Flow (Admin)

```
/upload
  ├── Select multiple images (drag & drop, browse, paste)
  │   ├── Reorder images by dragging
  │   ├── Remove individual images (X button)
  │   ├── Preview all images as thumbnail strip
  │   └── Max 10 images per post
  │
  ├── Description (shared across all images)
  ├── NSFW toggle (applies to entire post)
  └── Submit → uploads all images to Cloudinary → saves to Convex
```

### 1.2 Viewing Flow (Everyone)

```
Home Grid (Meme Card)
  ├── Shows first image as cover
  ├── Multi-image indicator: dot/pill badge "1/4" on top-right
  ├── Swipe left/right on mobile (touch)
  ├── Arrow buttons on desktop (hover to reveal)
  └── Dot indicators at bottom

Meme Detail Page (/meme/[shortId])
  ├── Full-size carousel with swipe + arrows
  ├── Dot indicators below image
  ├── Keyboard navigation (← →)
  └── Download downloads current image (or all as zip — future)
```

---

## 2. Schema Changes (`convex/schema.ts`)

### Current Schema

```ts
memes: defineTable({
  imageUrl: v.string(), // single image
  description: v.string(),
  uploadedAt: v.number(),
  isNsfw: v.optional(v.boolean()),
  shortId: v.string(),
  viewCount: v.optional(v.number()),
});
```

### Updated Schema

```ts
memes: defineTable({
  imageUrl: v.string(),                          // kept for backward compat (cover image / single image)
  imageUrls: v.optional(v.array(v.string())),    // NEW — array of Cloudinary URLs (ordered)
  description: v.string(),
  uploadedAt: v.number(),
  isNsfw: v.optional(v.boolean()),
  shortId: v.string(),
  viewCount: v.optional(v.number()),
})
  .index("by_uploadedAt", ["uploadedAt"])
  .index("by_shortId", ["shortId"]),
```

**Why this approach:**

- **Backward compatible:** Existing single-image memes keep working with `imageUrl`. No migration needed.
- **`imageUrls` is optional:** If `imageUrls` exists and has length > 1, it's a carousel. Otherwise, fall back to `imageUrl`.
- **Ordered array:** Image order is preserved as uploaded/arranged by the user.
- **No separate `memeImages` table:** Avoids extra queries and joins. Meme images are always loaded together — there's no case where you'd want a single image without its post context.

### Helper Logic

```ts
// Get all images for a meme (works for both old and new memes)
function getMemeImages(meme: {
  imageUrl: string;
  imageUrls?: string[];
}): string[] {
  if (meme.imageUrls && meme.imageUrls.length > 0) {
    return meme.imageUrls;
  }
  return [meme.imageUrl];
}

function isCarousel(meme: { imageUrls?: string[] }): boolean {
  return (meme.imageUrls?.length ?? 0) > 1;
}
```

---

## 3. Upload Changes

### 3.1 Upload Page (`app/upload/page.tsx`)

**Current:** Single file input, single preview, single upload.

**Updated:**

| Feature        | Current        | New                                   |
| -------------- | -------------- | ------------------------------------- |
| File selection | Single file    | Multiple files (`multiple` attribute) |
| State          | `selectedFile` | `selectedFiles: File[]`               |
| Preview        | Single image   | Thumbnail strip with reorder + remove |
| Paste support  | Single image   | Appends to list                       |
| Drop support   | Single file    | Multiple files                        |
| Max images     | 1              | 10                                    |

**State changes:**

```tsx
// Before
const [preview, setPreview] = useState<string | null>(null);
const [selectedFile, setSelectedFile] = useState<File | null>(null);

// After
const [previews, setPreviews] = useState<string[]>([]);
const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
```

**Preview strip component:**

```
┌─────────────────────────────────────────────────────┐
│  [img1]  [img2]  [img3]  [+ Add]                   │
│    ✕       ✕       ✕                                │
│  ← drag to reorder →                                │
└─────────────────────────────────────────────────────┘
```

- Each thumbnail has an X button to remove.
- Drag-to-reorder for arranging image order.
- "+ Add" button to add more images (up to max 10).
- First image in the list is the cover image.

### 3.2 Upload API (`app/api/upload/route.ts`)

**Current:** Accepts a single file, returns a single `secure_url`.

**Updated:** Accept multiple files, return array of URLs.

```ts
// New: POST /api/upload — accepts multiple files
export async function POST(request: NextRequest) {
  const session = await getServerSession(request.cookies);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (files.length > 10) {
    return NextResponse.json(
      { error: "Maximum 10 images allowed" },
      { status: 400 },
    );
  }

  const urls: string[] = [];
  for (const file of files) {
    // ... upload each to Cloudinary
    urls.push(result.secure_url);
  }

  return NextResponse.json({ secure_urls: urls });
}
```

> **Backward compat:** Also keep accepting `file` (single) for any existing integrations. Check for `files` first, fall back to `file`.

### 3.3 Convex Mutation (`convex/memes.ts`)

```ts
export const addMeme = mutation({
  args: {
    imageUrl: v.string(),
    imageUrls: v.optional(v.array(v.string())), // NEW
    description: v.string(),
    isNsfw: v.boolean(),
  },
  handler: async (ctx, args) => {
    // ... shortId generation (unchanged)

    await ctx.db.insert("memes", {
      imageUrl: args.imageUrl, // cover / first image
      imageUrls: args.imageUrls, // all images (if multi)
      description: args.description,
      isNsfw: args.isNsfw,
      uploadedAt: Date.now(),
      shortId,
    });
  },
});
```

---

## 4. Carousel Component

### 4.1 `ImageCarousel` Component

**File:** `components/image-carousel.tsx`

A reusable carousel component used in both `MemeCard` and `MemeClient`.

**Props:**

```ts
interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  aspectRatio?: "card" | "full"; // card = fixed h-72, full = max-h-[80vh]
  showArrows?: boolean; // desktop arrows (default: true)
  showDots?: boolean; // dot indicators (default: true)
  enableSwipe?: boolean; // touch swipe (default: true)
  enableKeyboard?: boolean; // ← → keys (default: false, true on detail page)
}
```

**Implementation approach:**

Use **shadcn/ui Carousel** (which wraps [Embla Carousel](https://www.embla-carousel.com/)):

- Already in the project's shadcn components (`components/ui/carousel.tsx`).
- Supports touch swipe, drag, snap, keyboard, and loop.
- Lightweight and performant.

```tsx
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

export function ImageCarousel({
  images,
  alt,
  aspectRatio = "card",
}: ImageCarouselProps) {
  if (images.length === 1) {
    // Single image — no carousel overhead
    return <img src={images[0]} alt={alt} className="..." />;
  }

  return (
    <Carousel className="relative">
      <CarouselContent>
        {images.map((url, i) => (
          <CarouselItem key={i}>
            <img src={url} alt={`${alt} - ${i + 1}`} className="..." />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {images.map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              current === i ? "bg-white" : "bg-white/40",
            )}
          />
        ))}
      </div>
    </Carousel>
  );
}
```

### 4.2 Multi-Image Badge

Show an indicator on meme cards when a post has multiple images:

```tsx
{
  images.length > 1 && (
    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
      1/{images.length}
    </div>
  );
}
```

Updates as the user swipes: `{currentIndex + 1}/{images.length}`

---

## 5. Component Changes

### 5.1 `MemeCard` (`components/meme-card.tsx`)

**Current:** Renders a single `<img>` tag.

**Updated:**

- Accept `imageUrls?: string[]` prop in addition to `imageUrl`.
- Compute `images = getMemeImages(meme)`.
- Replace `<img>` with `<ImageCarousel images={images} aspectRatio="card" />`.
- Prevent `<Link>` navigation on swipe — only navigate on tap/click without drag.

**Swipe vs Click conflict resolution:**

- Track pointer movement. If drag distance > 5px, suppress the `<Link>` click.
- Or wrap the carousel in a `div` with `onClick` that checks `e.defaultPrevented`.

### 5.2 `MemeClient` (`app/meme/[shortId]/meme-client.tsx`)

**Current:** Renders a single `<Image>` tag.

**Updated:**

- Compute `images = getMemeImages(meme)`.
- Replace with `<ImageCarousel images={images} aspectRatio="full" enableKeyboard />`.
- Download button downloads the **currently visible** image.
- Share link still points to the meme post (not individual image).

### 5.3 `MemeCardProps` Update

```ts
interface MemeCardProps {
  // ... existing props
  imageUrl: string;
  imageUrls?: string[]; // NEW
}
```

### 5.4 Home Content (`app/home-content.tsx`)

Pass `imageUrls` from the query result to `MemeCard`:

```tsx
<MemeCard
  imageUrl={meme.imageUrl}
  imageUrls={meme.imageUrls} // NEW
  // ... rest
/>
```

---

## 6. OG Image Changes

### Current (`app/api/og/[shortId]/route.tsx`)

Shows a single meme image in the OG preview.

### Updated

- Use the **first image** (`imageUrls?.[0] ?? imageUrl`) as the OG image.
- Optionally add a small multi-image indicator overlay to hint that there are more images.

---

## 7. Download Behavior

| Context         | Single Image        | Multi-Image                           |
| --------------- | ------------------- | ------------------------------------- |
| **Meme Card**   | Downloads the image | Downloads the currently visible image |
| **Detail Page** | Downloads the image | Downloads the currently visible image |
| **Future**      | —                   | "Download All" → zip file             |

For downloading the current image, the carousel exposes the current index via a callback or ref:

```tsx
const [currentIndex, setCurrentIndex] = useState(0);
// Pass to carousel: onSlideChange={setCurrentIndex}
// Download: images[currentIndex]
```

---

## 8. Mobile Touch & Gestures

- **Swipe:** Embla Carousel handles touch swipe natively.
- **Prevent vertical scroll hijack:** Embla only intercepts horizontal swipes. Vertical scrolling remains unaffected.
- **Snap behavior:** Each image snaps to center on release.
- **Loop:** Disabled by default — swipe stops at first/last image (like Instagram).

---

## 9. File Structure (New/Changed Files)

```
components/
  image-carousel.tsx              # NEW — reusable carousel component
  meme-card.tsx                   # CHANGED — use ImageCarousel
app/
  meme/
    [shortId]/
      meme-client.tsx             # CHANGED — use ImageCarousel
  upload/
    page.tsx                      # CHANGED — multi-file selection, preview strip, reorder
  api/
    upload/
      route.ts                    # CHANGED — accept multiple files
    og/
      [shortId]/
        route.tsx                 # CHANGED — use first image from imageUrls
  home-content.tsx                # CHANGED — pass imageUrls to MemeCard
convex/
  schema.ts                       # CHANGED — add imageUrls field
  memes.ts                        # CHANGED — accept imageUrls in addMeme mutation
lib/
  meme-images.ts                  # NEW — getMemeImages() helper
```

---

## 10. Constraints & Limits

| Constraint              | Value               | Reason                              |
| ----------------------- | ------------------- | ----------------------------------- |
| Max images per post     | 10                  | Matches Instagram, prevents abuse   |
| Max file size per image | 10 MB               | Cloudinary free tier limit          |
| Min images per post     | 1                   | A meme must have at least one image |
| Supported formats       | jpg, png, gif, webp | Same as current                     |

---

## 11. Implementation Order

1. **Phase 1 — Schema & Backend**
   - Add `imageUrls` optional field to `memes` table in `convex/schema.ts`
   - Update `addMeme` mutation to accept `imageUrls`
   - Update upload API to handle multiple files
   - Create `lib/meme-images.ts` helper
   - Deploy schema with `npm run convex:deploy`

2. **Phase 2 — Carousel Component**
   - Build `ImageCarousel` component using shadcn Carousel (Embla)
   - Support single-image fallback (no carousel wrapper)
   - Add dot indicators, arrows, swipe, multi-image badge
   - Handle swipe-vs-click conflict for `MemeCard` link

3. **Phase 3 — Integrate Carousel**
   - Update `MemeCard` to use `ImageCarousel`
   - Update `MemeClient` (detail page) to use `ImageCarousel`
   - Update `home-content.tsx` to pass `imageUrls`
   - Update download to use current slide index

4. **Phase 4 — Upload Page**
   - Convert upload to multi-file: state, file input, drag & drop, paste
   - Build preview thumbnail strip with reorder (drag) and remove
   - Upload all files sequentially to Cloudinary
   - Pass `imageUrls` array to `addMeme` mutation

5. **Phase 5 — Polish**
   - OG image: use first image from `imageUrls`
   - Loading skeleton for carousel
   - Keyboard navigation (← →) on detail page
   - Mobile gesture refinement
   - Existing single-image memes work unchanged (backward compat verified)

---

## 12. Future Enhancements

- **Download All as ZIP:** Bundle all images from a carousel into a zip file for download.
- **Per-image captions:** Optional description per image (not just per post).
- **Video support:** Mix images and short video clips in a single carousel.
- **Transition effects:** Fade or slide animations between images.
- **Fullscreen gallery:** Tap image on detail page to open fullscreen lightbox with zoom & pan.
- **Admin bulk reorder:** Allow admins to reorder images after upload.
