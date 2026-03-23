# Share Crow - Copilot Instructions

## Project Overview

Share Crow is a meme sharing website built with Next.js, TypeScript, shadcn/ui, and Convex as the real-time database. Users can browse, upload, share, and download memes with short-link support and OG image previews.

**Deployed at**: https://meme.justankit.dev/ (Vercel)

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server + Client Components)
- **Language**: TypeScript
- **Runtime**: React 19
- **Database**: Convex (real-time queries/mutations)
- **Authentication**: Custom email/password with cookie-based sessions (scrypt hashing, HttpOnly cookies, 30-day expiry)
- **Image Storage**: Cloudinary (folder: `share-crow-memes`)
- **Styling**: Tailwind CSS v4 with oklch colors
- **UI Components**: shadcn/ui (Radix primitives, CVA)
- **Theme**: Dark mode only (black theme, `next-themes`)
- **Toast Notifications**: Sonner
- **OG Images**: `@vercel/og` (Edge runtime, 1200×630)
- **Short IDs**: `nanoid` with Base62 alphabet (7 characters)
- **Forms**: `react-hook-form` + `zod` validation
- **PWA**: Service worker with standalone manifest
- **Font**: Creepster (Google Fonts) for headings, Geist Sans for body, Geist Mono for code
- **Icons**: Lucide React

## Project Structure

```
app/
  layout.tsx              # Root layout (fonts, metadata, providers)
  page.tsx                # Home page with meme grid
  home-content.tsx        # Paginated meme grid (client component)
  globals.css             # Global styles, oklch CSS variables
  not-found.tsx           # Custom 404 page
  login/
    page.tsx              # Sign in / sign up page
  upload/
    page.tsx              # Meme upload form (auth required)
  meme/
    [shortId]/
      page.tsx            # Meme detail (server: metadata + OG)
      meme-client.tsx     # Meme detail view (client: image, download, share)
  api/
    auth/
      [...all]/route.ts   # Auth endpoints (signup, signin, signout, session)
    memes/
      [shortId]/route.ts  # GET meme by shortId (cached)
    og/
      [shortId]/route.tsx # OG image generation (Edge runtime)
    upload/
      route.ts            # Image upload to Cloudinary (auth required)
components/
  meme-card.tsx           # Meme card with NSFW blur, download, share
  convex-provider.tsx     # Convex client provider
  theme-provider.tsx      # next-themes dark mode provider
  pwa-register.tsx        # Service worker registration
  ui/                     # shadcn/ui components
config/
  cloudinary.ts           # Cloudinary v2 SDK configuration
convex/
  schema.ts               # Database schema (memes, users, sessions)
  memes.ts                # Meme queries & mutations (pagination, shortId)
  users.ts                # User & session queries/mutations
hooks/
  use-mobile.ts           # Mobile breakpoint detection (768px)
lib/
  auth-client.ts          # Client-side auth hooks & functions (useSession, signIn, signUp, signOut)
  auth.ts                 # Server-side session helper (getServerSession)
  convex-server.ts        # ConvexHttpClient for server-side queries
  utils.ts                # cn() utility (clsx + tailwind-merge)
public/
  manifest.json           # PWA manifest
  sw.js                   # Service worker
  icons/                  # PWA icons (192x192, 512x512)
```

## Database Schema (Convex)

### Tables

- **memes**: `imageUrl`, `description`, `uploadedAt`, `isNsfw?`, `shortId` (7-char Base62). Indexes: `by_uploadedAt`, `by_shortId`
- **users**: `email`, `name`, `passwordHash`, `createdAt`. Index: `by_email`
- **sessions**: `userId` (ref to users), `token` (64-char hex), `expiresAt`, `createdAt`. Index: `by_token`

## Environment Variables

- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL
- `NEXT_PUBLIC_SITE_URL` — Site URL (falls back to `VERCEL_URL`)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name
- `CLOUDINARY_API_KEY` — Cloudinary API key (server only)
- `CLOUDINARY_API_SECRET` — Cloudinary API secret (server only)

## Coding Conventions

### Component Guidelines

- Use functional components with TypeScript
- Use `"use client"` directive for client-side components
- Keep components small and focused
- Use shadcn/ui components where possible
- Use Convex `useQuery` / `useMutation` hooks for data fetching in client components
- Use `ConvexHttpClient` for server-side data access (metadata generation, API routes)

### Styling Guidelines

- Use Tailwind CSS classes
- Dark theme only — use `bg-background` and `text-foreground` variables
- Use `cn()` utility for conditional classes
- Maintain consistent spacing with Tailwind's spacing scale
- oklch color system defined in `globals.css`

### Authentication Pattern

- Custom cookie-based auth (no third-party auth provider)
- Password hashing via `scrypt` with random salt
- Session token stored in `session_token` HttpOnly cookie
- Client-side: `useSession()` hook, `signIn.email()`, `signUp.email()`, `signOut()`
- Server-side: `getServerSession(cookies)` helper
- Sign-up disabled on production (Vercel)

### State Management

- Convex `useQuery` for real-time data
- React hooks for local UI state
- `sonner` toast for notifications

## Key Features

### Meme Cards

- Display meme image with NSFW blur overlay (toggle to reveal)
- Show description text (line-clamp-2)
- Download button (fetches blob and triggers save as `sharecrow-{shortId}.jpg`)
- Share button that copies meme link to clipboard
- Toast notifications: "Link Copied", "Download Started"
- Hover effects: border glow, shadow, upward translation, gradient overlay

### Meme Detail Page (`/meme/[shortId]`)

- Full-screen image display
- Server-side OG metadata generation for social sharing
- Download and share buttons
- 404 handling for missing memes

### Upload (`/upload`)

- Auth-required (redirects to `/login` if not signed in)
- Drag & drop, click to browse, or paste from clipboard
- Image preview before upload
- Description textarea + NSFW toggle
- Uploads to Cloudinary, saves metadata to Convex with generated shortId

### Pagination

- 6 memes per page
- Previous/Next navigation + direct page input
- Scroll to top on page change

### OG Image Generation

- Edge runtime at `/api/og/[shortId]`
- 1200×630 black background with meme image
- Used for social media link previews

### Theme

- Black/dark theme only
- No light mode toggle needed
- Use oklch colors defined in globals.css

## Commands

```bash
npm run dev          # Start dev server on port 4000
npm run build        # Build for production
npm run lint         # Run ESLint
npm run convex:dev   # Start Convex dev environment
npm run convex:deploy # Deploy Convex schema & functions
```
