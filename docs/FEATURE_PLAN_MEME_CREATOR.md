# Feature Plan: Meme Creator (`/create`)

## Concept

A browser-based meme editor where users pick a template (or upload their own image) and add text overlays to create memes — then download or publish directly to Share Crow.

---

## 1. User Flow

```
/create
  ├── Step 1: Pick a Template
  │   ├── Browse template gallery (grid of popular meme templates)
  │   ├── Search/filter templates by name
  │   └── OR upload your own image (drag & drop / paste / browse)
  │
  ├── Step 2: Edit Meme
  │   ├── Canvas showing the template image
  │   ├── Add top text / bottom text (classic meme style)
  │   ├── Add custom text boxes (drag to position)
  │   ├── Font controls: size, color, stroke color, alignment
  │   ├── Live preview as you type
  │   └── Undo/Redo support
  │
  └── Step 3: Export
      ├── Download as PNG/JPG
      └── Publish to Share Crow (auth required → goes through existing upload flow)
```

---

## 2. Template System

### 2.1 Where Templates Live

**Two sources:**

| Source                        | Storage                                           | Who can add                             |
| ----------------------------- | ------------------------------------------------- | --------------------------------------- |
| **Built-in templates**        | Cloudinary folder `share-crow-templates`          | Admin (seeded manually or via a script) |
| **User-uploaded base images** | Client-side only (no server upload until publish) | Anyone visiting `/create`               |

Built-in templates are stored in Convex so they're queryable and can be tagged/searched. User-uploaded base images stay in the browser (as an object URL or data URL) — they only hit Cloudinary if the user publishes the finished meme.

### 2.2 Schema Changes (`convex/schema.ts`)

```ts
templates: defineTable({
  name: v.string(), // "Drake Hotline Bling", "Distracted Boyfriend"
  imageUrl: v.string(), // Cloudinary URL
  category: v.optional(v.string()), // "classic", "reaction", "animal", etc.
  textZones: v.optional(
    v.array(
      // pre-defined text positions for this template
      v.object({
        label: v.string(), // "Top Text", "Bottom Text", "Caption"
        x: v.number(), // % from left (0-100)
        y: v.number(), // % from top (0-100)
        width: v.number(), // % of image width
        maxFontSize: v.optional(v.number()),
      }),
    ),
  ),
  usageCount: v.optional(v.number()), // track popularity
  createdAt: v.number(),
})
  .index("by_category", ["category"])
  .index("by_usageCount", ["usageCount"])
  .index("by_name", ["name"])
  .searchIndex("search_name", { searchField: "name" });
```

**Why `textZones`:** Classic meme templates have known text positions (e.g. Drake top/bottom). Pre-defining these gives users a one-click starting point — they can still add custom text boxes anywhere.

### 2.3 Convex Functions (`convex/templates.ts`)

| Function          | Type     | Purpose                                                                                                         |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `getTemplates`    | query    | Paginated list of templates. Supports optional `category` filter. Ordered by `usageCount` desc (popular first). |
| `searchTemplates` | query    | Full-text search on `name` via Convex search index.                                                             |
| `getTemplate`     | query    | Single template by ID.                                                                                          |
| `incrementUsage`  | mutation | Bumps `usageCount` when a user selects a template.                                                              |
| `addTemplate`     | mutation | Admin-only. Inserts a new template.                                                                             |

### 2.4 Seeding Templates

A one-time script (`scripts/seed-templates.ts`) that uploads ~20-30 popular meme templates to Cloudinary and inserts records into Convex. Templates sourced from public domain / Creative Commons images.

Starter set categories:

- **Classic:** Drake, Distracted Boyfriend, Two Buttons, Expanding Brain
- **Reaction:** Surprised Pikachu, This Is Fine, Stonks
- **Animal:** Doge, Grumpy Cat, Cheems
- **Text-heavy:** Change My Mind, One Does Not Simply, Batman Slapping Robin

---

## 3. Meme Editor (The Canvas)

### 3.1 Rendering Approach

**HTML5 Canvas via `<canvas>` element** — not a DOM-based editor.

**Why Canvas over DOM overlay:**

- Pixel-perfect export (what you see = what you download)
- No CSS-to-image conversion issues
- Text rendering with stroke/outline (the classic meme look) is native to Canvas API
- Better performance for drag/resize operations

### 3.2 Library Choice

**No heavy library.** Use the native Canvas 2D API directly with a thin React wrapper. The editor needs are simple enough:

- Draw background image
- Draw text with stroke
- Handle mouse/touch drag for text positioning

If complexity grows, consider `fabric.js` or `konva` (React: `react-konva`) later — but start vanilla to keep the bundle small.

**Fallback consideration:** If drag-to-position and resizable text boxes become complex, adopt `react-konva` (tree-shakeable, ~45KB gzipped). It provides:

- Draggable/resizable nodes out of the box
- Built-in hit detection
- Touch support
- Easy `toDataURL()` for export

### 3.3 Editor State

```ts
// hooks/use-meme-editor.ts

interface TextBox {
  id: string;
  text: string;
  x: number; // % position
  y: number;
  fontSize: number; // px
  fontFamily: string; // "Impact", "Arial Black", etc.
  fillColor: string; // text color (default: white)
  strokeColor: string; // outline color (default: black)
  strokeWidth: number; // outline thickness (default: 2)
  alignment: "left" | "center" | "right";
  rotation: number; // degrees (0 for MVP)
  isDragging: boolean;
}

interface EditorState {
  templateImage: HTMLImageElement | null;
  textBoxes: TextBox[];
  selectedBoxId: string | null;
  history: EditorState[]; // for undo
  historyIndex: number;
}
```

### 3.4 Text Rendering (Classic Meme Style)

The iconic meme look = white Impact font with black outline:

```ts
// Default text style
ctx.font = `bold ${fontSize}px Impact, "Arial Black", sans-serif`;
ctx.textAlign = "center";
ctx.fillStyle = "white";
ctx.strokeStyle = "black";
ctx.lineWidth = fontSize / 15; // proportional outline
ctx.lineJoin = "round";

// Draw outline first, then fill (so fill sits on top)
ctx.strokeText(text, x, y);
ctx.fillText(text, x, y);
```

Auto-shrink: If text is wider than the image, reduce font size until it fits. Classic meme generators do this.

### 3.5 Font Options

Provide 4-5 fonts:

| Font          | Style                 | Use                       |
| ------------- | --------------------- | ------------------------- |
| Impact        | Classic meme          | Default                   |
| Arial Black   | Bold, clean           | Alt classic               |
| Comic Sans MS | Casual/ironic         | Intentionally bad         |
| Creepster     | Share Crow brand font | Already loaded in project |
| monospace     | Tech/code memes       | Niche                     |

No need to load extra fonts — these are all system fonts or already in the project.

---

## 4. Component Architecture

### 4.1 Page: `app/create/page.tsx`

Top-level client component. Two-phase UI:

1. **Template picker** (shown first)
2. **Editor** (shown after template selection)

```
"use client"
- State: selectedTemplate | uploadedImage
- If no template selected → show <TemplatePicker />
- If template selected → show <MemeEditor />
```

### 4.2 `components/template-picker.tsx`

```
┌─────────────────────────────────────────────────┐
│  Choose a Template          [Search...] 🔎      │
│                                                  │
│  [All] [Classic] [Reaction] [Animal] [Text]     │  ← category tabs
│                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │         │ │         │ │         │            │
│  │  Drake  │ │ Pikachu │ │  Doge   │            │
│  │         │ │         │ │         │            │
│  └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  This   │ │ Expand  │ │ Change  │            │
│  │ Is Fine │ │ Brain   │ │ My Mind │            │
│  │         │ │         │ │         │            │
│  └─────────┘ └─────────┘ └─────────┘           │
│                                                  │
│  ─── OR ───                                      │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │   📁 Upload your own image               │   │
│  │   Drag & drop, paste, or click to browse │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

- Grid of template thumbnails (reuse Cloudinary URL with `w_300,h_300,c_fill` transform for thumbnails)
- Category filter tabs
- Search bar using Convex full-text search
- Upload drop zone at the bottom (same pattern as existing `/upload` page)

### 4.3 `components/meme-editor.tsx`

```
┌───────────────────────────────────────────────────────┐
│  [← Back]  Meme Editor              [Download] [Post] │
├───────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │              TOP TEXT GOES HERE                   │  │
│  │                                                  │  │
│  │                                                  │  │
│  │            [ template image ]                    │  │
│  │                                                  │  │
│  │                                                  │  │
│  │            BOTTOM TEXT GOES HERE                  │  │
│  │                                                  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Text Controls ──────────────────────────────────┐ │
│  │  Top Text:    [_________________________]        │ │
│  │  Bottom Text: [_________________________]        │ │
│  │  [+ Add Text Box]                                │ │
│  │                                                   │ │
│  │  Font: [Impact ▼]  Size: [48]  Color: [⬜][⬛]  │ │
│  │  Align: [L] [C] [R]                             │ │
│  └──────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

**Desktop:** Side-by-side (canvas left, controls right).
**Mobile:** Stacked (canvas top, controls bottom with collapsible sections).

### 4.4 `components/meme-canvas.tsx`

The actual `<canvas>` wrapper:

- Receives `templateImage` + `textBoxes` as props
- Redraws on every state change
- Handles mouse/touch events for text box dragging
- Exposes `exportAsBlob()` method via `useImperativeHandle`

### 4.5 `components/text-controls.tsx`

Form controls for the selected text box:

- Text input
- Font family dropdown
- Font size slider
- Fill color picker (simple preset palette, not a full color wheel)
- Stroke color picker
- Alignment buttons
- Delete text box button

---

## 5. Export Flow

### 5.1 Download (No auth required)

```ts
const handleDownload = () => {
  const canvas = canvasRef.current;
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sharecrow-meme-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
};
```

Pure client-side. No server round-trip. No auth needed.

### 5.2 Publish to Share Crow (Auth required)

Reuses the existing upload pipeline:

```ts
const handlePublish = async () => {
  // 1. Export canvas to blob
  const blob = await canvasRef.current.exportAsBlob();

  // 2. Convert to File object
  const file = new File([blob], "meme.png", { type: "image/png" });

  // 3. Upload to Cloudinary via existing /api/upload
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const { secure_url } = await res.json();

  // 4. Save to Convex via existing addMeme mutation
  await addMeme({ imageUrl: secure_url, description, isNsfw });

  // 5. Increment template usage count
  if (templateId) {
    await incrementUsage({ templateId });
  }
};
```

**Key point:** Zero changes to the existing upload API or Convex `addMeme` mutation. The meme creator just produces an image blob that feeds into the same pipeline.

### 5.3 Publish Dialog

When user clicks "Post to Share Crow":

```
┌────────────────────────────────┐
│  Post to Share Crow            │
│                                │
│  Description:                  │
│  [________________________]    │
│                                │
│  □ Mark as NSFW                │
│                                │
│  [Cancel]        [Post Meme]   │
└────────────────────────────────┘
```

Same fields as the existing upload page (description + NSFW toggle). Presented as a `Dialog` (shadcn/ui) overlay.

---

## 6. Canvas Sizing & Responsiveness

### 6.1 Internal Resolution

The canvas always renders at a fixed internal resolution for consistent exports:

```ts
const CANVAS_WIDTH = 800; // px internal
const CANVAS_HEIGHT = auto; // calculated from image aspect ratio, capped at 800
```

### 6.2 Display Scaling

CSS scales the canvas to fit the viewport:

```css
canvas {
  width: 100%;
  max-width: 800px;
  height: auto;
}
```

The internal resolution stays 800px wide regardless of screen size. Mouse/touch coordinates are transformed from display space to canvas space.

### 6.3 Mobile Touch Support

- Touch drag for text box positioning
- Pinch-to-zoom is **disabled** on the canvas (prevent accidental zoom)
- Controls below the canvas with large touch targets

---

## 7. Integration Points

### 7.1 Navigation

Add "Create" link to the home page header (next to "Upload"):

```
[Share Crow]                    [Create] [Upload]
```

### 7.2 From Meme Detail Page

Add "Use as Template" button on the meme detail page. Clicking it navigates to `/create?image={encodedImageUrl}`. The create page detects the query param and loads that image as the base.

### 7.3 From Upload Page

Add a "or Create a Meme" link on the upload page that links to `/create`.

---

## 8. File Changes Summary

| File                                 | Change                                                |
| ------------------------------------ | ----------------------------------------------------- |
| `convex/schema.ts`                   | Add `templates` table                                 |
| `convex/templates.ts`                | **New.** Template CRUD + search queries               |
| `app/create/page.tsx`                | **New.** Create page (orchestrator)                   |
| `components/template-picker.tsx`     | **New.** Template gallery + upload zone               |
| `components/meme-editor.tsx`         | **New.** Editor layout (canvas + controls)            |
| `components/meme-canvas.tsx`         | **New.** Canvas rendering + interaction               |
| `components/text-controls.tsx`       | **New.** Font/color/size controls                     |
| `components/publish-dialog.tsx`      | **New.** Description + NSFW dialog before posting     |
| `hooks/use-meme-editor.ts`           | **New.** Editor state, undo/redo, text box management |
| `scripts/seed-templates.ts`          | **New.** One-time template seeding script             |
| `app/page.tsx`                       | Add "Create" nav link                                 |
| `app/meme/[shortId]/meme-client.tsx` | Add "Use as Template" button                          |
| `app/upload/page.tsx`                | Add "or Create a Meme" link                           |

**Total: 9 new files, 3 modified files.**

---

## 9. Implementation Order

```
Phase 1: Canvas Editor Core
├── 1a. hooks/use-meme-editor.ts — state management, undo/redo
├── 1b. components/meme-canvas.tsx — canvas rendering, text drawing
├── 1c. components/text-controls.tsx — font/color/size UI
├── 1d. components/meme-editor.tsx — layout combining canvas + controls
├── 1e. Export: download as PNG (client-side only)
│
Phase 2: Template System
├── 2a. convex/schema.ts — add templates table
├── 2b. convex/templates.ts — queries (list, search, get)
├── 2c. components/template-picker.tsx — gallery UI
├── 2d. scripts/seed-templates.ts — upload starter templates
│
Phase 3: Create Page + Publish
├── 3a. app/create/page.tsx — two-phase page (pick → edit)
├── 3b. components/publish-dialog.tsx — description + NSFW dialog
├── 3c. Wire publish to existing /api/upload + addMeme
│
Phase 4: Integration & Polish
├── 4a. Nav links (home, upload, meme detail)
├── 4b. "Use as Template" button on meme detail
├── 4c. Mobile responsive pass
├── 4d. Touch drag support
└── 4e. Loading states and error handling
```

---

## 10. Risks & Considerations

| Risk                                              | Mitigation                                                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Canvas text rendering differs across browsers** | Use simple fonts (Impact, Arial Black) that render consistently. Test on Chrome, Firefox, Safari.                                                             |
| **Mobile editing is clunky**                      | Keep mobile controls simple (top/bottom text inputs only). Advanced positioning is desktop-focused.                                                           |
| **Large template images slow the editor**         | Use Cloudinary transforms to serve templates at max 800px width. Full-res only on export if needed.                                                           |
| **CORS on template images**                       | Cloudinary URLs are same-origin or CORS-enabled. Set `crossOrigin="anonymous"` on image loads. Canvas `toBlob()` will fail if tainted by cross-origin images. |
| **Bundle size if adding canvas library**          | Start with vanilla Canvas API. Only add `react-konva` if drag/resize UX is insufficient.                                                                      |
| **Template copyright**                            | Use only public domain / CC0 templates. Document sources in seed script.                                                                                      |
| **Canvas export quality**                         | Export at internal resolution (800px), not display resolution. Offer 2x option for high-res export.                                                           |

---

## 11. Future Enhancements (Not in MVP)

- **Stickers/overlays** — emoji, sunglasses, arrows, etc. draggable on canvas
- **Image filters** — deep-fried, grayscale, sepia, contrast boost
- **Multi-panel memes** — 2-panel, 4-panel grid layouts
- **Community templates** — users can submit their images as public templates
- **Template favorites** — save frequently used templates
- **History/drafts** — save work-in-progress to localStorage
- **AI text suggestions** — generate caption ideas from the template name
