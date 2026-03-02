# Share Crow - Copilot Instructions

## Project Overview

Share Crow is a meme sharing website built with Next.js, TypeScript, and shadcn/ui components.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Theme**: Dark mode only (black theme)
- **Toast Notifications**: Sonner
- **Font**: Creepster (Google Fonts) for headings, Geist for body

## Project Structure

```
app/
  page.tsx        # Home page with meme grid
  layout.tsx      # Root layout with theme provider
  globals.css     # Global styles and CSS variables
  upload/         # Upload route (future implementation)
components/
  ui/             # shadcn/ui components
  meme-card.tsx   # Meme card component
lib/
  utils.ts        # Utility functions (cn helper)
public/
  memes/          # Static meme images
```

## Coding Conventions

### Component Guidelines

- Use functional components with TypeScript
- Use `"use client"` directive for client-side components
- Keep components small and focused
- Use shadcn/ui components where possible

### Styling Guidelines

- Use Tailwind CSS classes
- Dark theme only - use `bg-background` and `text-foreground` variables
- Use `cn()` utility for conditional classes
- Maintain consistent spacing with Tailwind's spacing scale

### State Management

- Use React hooks for local state
- Use `sonner` toast for notifications

## Key Features

### Meme Cards

- Display meme image
- Show description text
- Include share button that copies link to clipboard
- Toast notification on share: "Link Copied"

### Theme

- Black/dark theme only
- No light mode toggle needed
- Use oklch colors defined in globals.css

## Future Routes

- `/upload` - For uploading new memes (to be implemented)

## Commands

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run lint   # Run ESLint
```
