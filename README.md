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

- **Schema**: `memes` table with `imageUrl`, `description`, `uploadedAt`, and `isNsfw` fields
- **Index**: `by_uploadedAt` index for efficient sorted queries
- **Pagination**: Memes queried with pagination (6 per page)
- **Queries**: `getMemesWithPagination` (paginated memes, newest first) and `getMeme` (single meme by ID)
- **Mutations**: `addMeme` (insert new meme with timestamp and NSFW flag)
- **Provider**: `ConvexClientProvider` wrapping the app with `NEXT_PUBLIC_CONVEX_URL`

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

- User authentication/authorization
- Search and filtering functionality
- User profiles
- Comments or reactions
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
  ├── page.tsx              # Home page with meme grid (Convex query)
  ├── layout.tsx            # Root layout with Convex + theme providers
  ├── globals.css           # Global styles and CSS variables
  ├── api/
  │   └── upload/
  │       └── route.ts      # Cloudinary upload API route
  ├── meme/
  │   └── [id]/
  │       └── page.tsx      # Individual meme detail page
  └── upload/
      └── page.tsx          # Upload page with form
components/
  ├── convex-provider.tsx   # Convex client provider
  ├── meme-card.tsx         # Meme card with share/download
  ├── theme-provider.tsx    # next-themes provider wrapper
  └── ui/                   # shadcn/ui components (50+)
config/
  └── cloudinary.ts         # Cloudinary SDK configuration
convex/
  ├── schema.ts             # Database schema (memes table)
  ├── memes.ts              # Queries and mutations
  └── _generated/           # Auto-generated Convex types
lib/
  └── utils.ts              # Utility functions (cn helper)
```
