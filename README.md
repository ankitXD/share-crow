# 🦅 Share Crow

A dark-themed meme sharing website built with modern web technologies.

## 📋 Project Status

This project is in **active development** with a functional full-stack meme sharing flow — users can upload memes to Cloudinary, persist them in Convex, and browse/share/download them. Features include pagination, NSFW content protection, clipboard paste support, and SEO optimization.

## ✅ Implemented Features

### 🏠 Home Page

- **Meme Grid Layout**: Responsive grid displaying meme cards (1/2/3 columns based on screen size)
- **Pagination**: Memes displayed 6 per page with next/previous buttons and direct page input
- **Real-time Data**: Memes fetched from Convex database (sorted newest first)
- **Loading State**: Spinner while memes are being fetched
- **Empty State**: Call-to-action prompting users to upload the first meme
- **Hero Section**: Large "Share Crow" heading with Creepster font
- **Fully Responsive**: Mobile-first design with breakpoints for tablets and desktops

### 🃏 Meme Card Component

- **Image Display**: High-quality image rendering with fixed-height cover display
- **NSFW Content Protection**: Optional blur overlay for NSFW memes with "Show" button to reveal
- **Emoji Reaction Bar**: 6 predefined emojis (😂🔥💀❤️👎😮) with toggle behavior and counts
- **View Count**: Eye icon with compact number formatting (1k, 1.2k)
- **Comment Count**: Message icon showing number of comments
- **Hover Effects**: Smooth scale animations and gradient overlays on hover
- **Share Button**: Copies shareable meme link (`/meme/[id]`) to clipboard with toast notification
- **Download Button**: Downloads meme image directly to user's device via blob fetch
- **Glass-morphism Design**: Semi-transparent cards with backdrop blur
- **Border Animations**: Glowing border effect on hover with primary color shadow
- **Description Display**: Truncated text with line clamps
- **Clickable Cards**: Links to individual meme detail page

### 📄 Individual Meme Page (`/meme/[id]`)

- **Dynamic Routing**: Next.js App Router dynamic route with Convex data fetching
- **SEO Optimization**: Dynamic Open Graph meta tags for social sharing
- **Full-size Image**: Responsive image display with auto height and max-height constraint
- **Meme Description**: Centered text below the image
- **View Count Display**: Shows total views, tracked on page load with 24h dedup per fingerprint
- **Large Reaction Bar**: Emoji reactions with toggle behavior and real-time updates
- **Comment Section**: Anonymous commenting with optional name, 500 char limit, edit/delete own comments
- **Share & Download Buttons**: Same functionality as meme card actions
- **Loading State**: Spinner while meme data loads
- **404 Handling**: Calls `notFound()` if meme ID doesn't exist
- **Back Navigation**: Clickable "Share Crow" heading links back to home

### 📤 Upload Page

- **File Input**: Hidden file picker triggered by drag-and-drop zone
- **Drag & Drop Zone**: Interactive area for dragging images with visual feedback
- **Paste Support**: Users can paste images directly from clipboard
- **Image Preview**: Real-time preview of selected image before upload with remove button
- **Description Field**: Textarea for adding meme descriptions with helper text
- **NSFW Toggle**: Switch to mark memes as Not Safe For Work
- **File Validation**: Ensures only image files are accepted (client-side)
- **Real Upload Flow**: Uploads image to Cloudinary via API route, saves metadata to Convex
- **Loading States**: Disabled button and spinner during upload
- **Post-upload Redirect**: Redirects to home page after successful upload
- **Back Navigation**: Button to return to home page
- **Responsive Layout**: Max-width constrained form optimized for all screen sizes

### ⚙️ Backend API

- **Upload Route** (`/api/upload`): Next.js API route that accepts `FormData`, streams the image buffer to Cloudinary, and returns the `secure_url`
- **Cloudinary Integration**: Server-side Cloudinary SDK configured via environment variables (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
- **Error Handling**: Returns structured JSON errors with appropriate HTTP status codes

### 🗄️ Database (Convex)

- **Schema**: 6 tables — `memes`, `users`, `sessions`, `reactions`, `memeViews`, `comments`
- **Memes Table**: `imageUrl`, `description`, `uploadedAt`, `isNsfw?`, `shortId`, `viewCount?`
- **Reactions Table**: `memeId`, `fingerprint`, `emoji`, `createdAt` — one reaction per fingerprint per meme
- **Views Table**: `memeId`, `fingerprint`, `viewedAt` — 24h deduplication window
- **Comments Table**: `memeId`, `fingerprint`, `name`, `text`, `createdAt`, `updatedAt?`, `isDeleted?`
- **Pagination**: Memes queried with pagination (6 per page) with joined reaction counts, comment counts, view counts
- **Queries**: `getMemesWithPagination` (paginated with stats), `getMemeByShortId`, `getAdjacentMemes`
- **Mutations**: `addMeme`, `toggleReaction`, `recordView`, `addComment`, `editComment`, `deleteComment`
- **Provider**: `ConvexClientProvider` wrapping the app with `NEXT_PUBLIC_CONVEX_URL`
- **Constraint**: Object keys must be ASCII-only — reaction counts use `Array<{emoji, count}>` format

### 😂 Reactions (Anonymous)

- **6 Predefined Emojis**: 😂 🔥 💀 ❤️ 👎 😮
- **Toggle Behavior**: Click to react, click same to un-react, click different to switch
- **One Per User**: One reaction per fingerprint per meme
- **Debounced**: 300ms client-side debounce to prevent spam
- **Real-time**: Updates via Convex subscriptions propagate to all viewers

### 👁️ Views (Anonymous)

- **Tracked on Detail Page**: Only meme detail page visits count (not home grid)
- **Deduplicated**: Per fingerprint per meme with 24h window
- **Denormalized**: `viewCount` on memes table for fast reads
- **Backward Compatible**: Existing memes default to 0 views via `v.optional`

### 💬 Comments (Anonymous)

- **Anonymous Posting**: Optional display name (defaults to "Anonymous")
- **500 Character Limit**: HTML stripped server-side
- **Edit/Delete Own**: Matched by fingerprint, soft delete via `isDeleted` flag
- **Real-time Updates**: Via Convex subscriptions

### 🔑 Anonymous Fingerprint System

- **`crypto.randomUUID()`** stored in localStorage (`sc_fingerprint` key)
- **Shared** by reactions, views, and comments
- **Generated once** per browser, persists across sessions
- **No login required** for any interaction

### 🎨 Design System

- **Dark Theme Only**: Pure black background with vibrant accents
- **Custom Color Palette**: OKLCH-based colors for better color accuracy
- **Typography**:
  - Creepster font for headings (Google Fonts)
  - Geist Sans for body text
  - Geist Mono for code
- **Tailwind CSS v4**: Latest version with modern features
- **shadcn/ui Components**: Full component library installed and configured
- **Consistent Spacing**: Tailwind spacing scale throughout

### 🔔 User Feedback

- **Toast Notifications**: Using Sonner for elegant notifications
  - "Link Copied" on share
  - "Download Started" on download
  - "Meme uploaded successfully!" on upload
  - Error messages for validation and upload failures
- **Loading States**: Spinners and disabled buttons during async operations

## 🛠️ Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript 5
- **Database**: Convex (real-time backend)
- **Image Storage**: Cloudinary
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (complete library)
- **Icons**: Lucide React
- **Fonts**: Google Fonts (Creepster, Geist)
- **Notifications**: Sonner
- **Theme**: next-themes (dark mode only)

## 🚧 Not Yet Implemented

- Search and filtering functionality
- User profiles
- Admin panel
- Analytics

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server (Next.js)
npm run dev

# Run Convex development server (in a separate terminal)
npm run convex:dev

# Deploy Convex to production
npm run convex:deploy

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_CONVEX_URL=<your-convex-deployment-url>
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📁 Project Structure

```
app/
  ├── page.tsx              # Home page with meme grid
  ├── home-content.tsx      # Paginated meme grid (client component)
  ├── layout.tsx            # Root layout with Convex + theme providers
  ├── globals.css           # Global styles and CSS variables
  ├── not-found.tsx         # Custom 404 page
  ├── api/
  │   ├── auth/[...all]/route.ts  # Auth endpoints
  │   ├── memes/[shortId]/route.ts # GET meme by shortId
  │   ├── og/[shortId]/route.tsx   # OG image generation
  │   └── upload/route.ts          # Cloudinary upload API route
  ├── login/page.tsx        # Sign in / sign up page
  ├── meme/
  │   └── [shortId]/
  │       ├── page.tsx      # Meme detail (server: metadata + OG)
  │       └── meme-client.tsx # Meme detail view (client)
  └── upload/page.tsx       # Upload page with form
components/
  ├── convex-provider.tsx   # Convex client provider
  ├── meme-card.tsx         # Meme card with reactions, stats, share/download
  ├── reaction-bar.tsx      # Emoji reaction toggle bar
  ├── comment-section.tsx   # Comment list + form (anonymous)
  ├── theme-provider.tsx    # next-themes provider wrapper
  ├── pwa-register.tsx      # Service worker registration
  └── ui/                   # shadcn/ui components (50+)
config/
  └── cloudinary.ts         # Cloudinary SDK configuration
convex/
  ├── schema.ts             # Database schema (6 tables)
  ├── memes.ts              # Meme queries & mutations (with joined stats)
  ├── reactions.ts          # Reaction toggle & queries
  ├── views.ts              # View tracking (24h dedup)
  ├── comments.ts           # Comment CRUD
  ├── users.ts              # User & session queries/mutations
  └── _generated/           # Auto-generated Convex types
lib/
  ├── auth-client.ts        # Client-side auth hooks
  ├── auth.ts               # Server-side session helper
  ├── convex-server.ts      # ConvexHttpClient for server-side
  ├── fingerprint.ts        # Anonymous user fingerprint
  ├── reactions.ts          # REACTION_EMOJIS constant
  └── utils.ts              # Utility functions (cn helper)
```
