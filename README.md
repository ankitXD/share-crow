# 🦅 Share Crow

A dark-themed meme sharing website built with Next.js, TypeScript, Convex, and Cloudinary.

**Live**: [meme.justankit.dev](https://meme.justankit.dev/)

## ✨ Features

### Meme Browsing & Sharing

- Responsive meme grid (1/2/3 columns) with 6-per-page pagination
- NSFW blur overlay with reveal toggle
- Share (copy link) & download buttons with toast notifications
- Glass-morphism cards with hover glow effects

### Meme Detail Page (`/meme/[shortId]`)

- Full-size image with OG meta tags for social previews
- View count (24h dedup per fingerprint), reactions, and comments
- Short-link support via 7-char Base62 `nanoid`

### Reactions (Anonymous)

- 6 emojis: 😂 🔥 💀 ❤️ 👎 😮
- Toggle behavior — one reaction per fingerprint per meme
- 300ms debounce, real-time updates via Convex subscriptions

### Comments (Anonymous)

- Optional display name (defaults to "Anonymous"), 500 char limit
- Edit/delete own comments (matched by fingerprint, soft delete)
- Real-time updates via Convex subscriptions

### Upload (`/upload`)

- Auth-required — drag & drop, click to browse, or paste from clipboard
- Image preview, description textarea, NSFW toggle
- Uploads to Cloudinary → saves metadata to Convex with generated `shortId`

### Admin Panel (`/admin`)

- Auth-gated dashboard (authenticated users = admins, sign-up disabled in prod)
- **Overview stats**: total memes, views, reactions, comments (real-time)
- **Meme management table**: searchable by description/shortId, sortable by views/reactions/comments/date
- **Edit meme**: update description and NSFW flag
- **Delete meme**: cascade deletes reactions, views, and comments
- **Meme detail drawer**: side sheet with full image, per-emoji reaction breakdown, all comments
- **Comment moderation**: admin can hard-delete any comment

### Authentication

- Custom cookie-based auth (scrypt hashing, HttpOnly cookies, 30-day expiry)
- Sign-up disabled on production (Vercel) — authenticated users are implicitly admins

### Anonymous Fingerprint System

- `crypto.randomUUID()` in localStorage (`sc_fingerprint` key)
- Shared by reactions, views, and comments — no login required

### PWA Support

- Service worker with standalone manifest, installable on mobile

## 🛠️ Tech Stack

| Layer     | Tech                                  |
| --------- | ------------------------------------- |
| Framework | Next.js 16 (App Router)               |
| Language  | TypeScript 5, React 19                |
| Database  | Convex (real-time)                    |
| Images    | Cloudinary                            |
| Styling   | Tailwind CSS v4, shadcn/ui            |
| Auth      | Custom cookie-based (scrypt)          |
| OG Images | `@vercel/og` (Edge)                   |
| Theme     | Dark only (next-themes)               |
| Icons     | Lucide React                          |
| Font      | Creepster (headings), Geist Sans/Mono |

## 🗄️ Database Schema

6 tables in Convex: `memes`, `users`, `sessions`, `reactions`, `memeViews`, `comments`

- **memes**: `imageUrl`, `description`, `uploadedAt`, `isNsfw?`, `shortId`, `viewCount?`
- **reactions**: one per fingerprint per meme (emoji toggle)
- **memeViews**: 24h dedup per fingerprint per meme
- **comments**: anonymous with optional name, soft delete, edit support
- **users/sessions**: custom auth with cookie-based sessions

## 🚀 Getting Started

```bash
npm install          # Install dependencies
npm run dev          # Dev server (port 4000)
npm run convex:dev   # Convex dev environment
npm run build        # Production build
npm run convex:deploy # Deploy Convex functions
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_CONVEX_URL=<convex-deployment-url>
NEXT_PUBLIC_SITE_URL=<site-url>
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloudinary-cloud-name>
CLOUDINARY_API_KEY=<cloudinary-api-key>
CLOUDINARY_API_SECRET=<cloudinary-api-secret>
```
