# 🦅 Share Crow

A dark-themed meme sharing website built with modern web technologies.

## 📋 Project Status

This project is currently in **active development** with core frontend features implemented.

## ✅ Implemented Features

### 🏠 Home Page

- **Meme Grid Layout**: Responsive grid displaying meme cards (1/2/3 columns based on screen size)
- **Static Meme Data**: Currently using placeholder images from picsum.photos
- **Hero Section**: Large "Share Crow" heading with Creepster font
- **Fully Responsive**: Mobile-first design with breakpoints for tablets and desktops

### 🃏 Meme Card Component

- **Image Display**: High-quality image rendering with aspect ratio preservation
- **Hover Effects**: Smooth scale animations and gradient overlays on hover
- **Share Button**: Copies shareable link to clipboard with toast notification
- **Download Button**: Downloads meme image directly to user's device
- **Glass-morphism Design**: Semi-transparent cards with backdrop blur
- **Border Animations**: Glowing border effect on hover
- **Description Display**: Truncated text with line clamps

### 📤 Upload Page

- **File Input**: Traditional file picker for image selection
- **Drag & Drop Zone**: Interactive area for dragging images
- **Image Preview**: Real-time preview of selected image before upload
- **Description Field**: Textarea for adding meme descriptions
- **File Validation**: Ensures only image files are accepted
- **Upload Simulation**: Frontend upload flow with loading states
- **Back Navigation**: Button to return to home page
- **Responsive Layout**: Optimized for all screen sizes

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
  - Error messages for validation failures
- **Loading States**: UI feedback during async operations

## 🛠️ Tech Stack

- **Framework**: Next.js 16.1 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (complete library)
- **Icons**: Lucide React
- **Fonts**: Google Fonts (Creepster, Geist)
- **Notifications**: Sonner
- **Theme**: next-themes (dark mode only)

## 🚧 Not Yet Implemented

- Backend API (no server-side logic)
- Database integration (no data persistence)
- User authentication/authorization
- Real meme upload to cloud storage
- Individual meme pages (`/meme/[id]`)
- Search and filtering functionality
- User profiles
- Comments or reactions
- Admin panel
- SEO optimization
- Analytics

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📁 Project Structure

```
app/
  ├── page.tsx          # Home page with meme grid
  ├── layout.tsx        # Root layout with theme provider
  ├── globals.css       # Global styles and CSS variables
  └── upload/
      └── page.tsx      # Upload page with form
components/
  ├── meme-card.tsx     # Meme card with share/download
  └── ui/               # shadcn/ui components (50+)
```
