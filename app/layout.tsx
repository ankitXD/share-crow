import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Creepster } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ConvexClientProvider } from "@/components/convex-provider";
import { PWARegister } from "@/components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const creepster = Creepster({
  variable: "--font-creepster",
  subsets: ["latin"],
  weight: "400",
});

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Share Crow - Discover & Share the Best Memes Online",
  description:
    "Browse, upload, and share hilarious memes with the community. React with emojis, discover trending content, and build your meme collection.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Share Crow",
  },
  openGraph: {
    title: "Share Crow - Discover & Share the Best Memes Online",
    description:
      "Browse, upload, and share hilarious memes with the community. React with emojis, discover trending content, and build your meme collection.",
    url: baseUrl,
    type: "website",
    images: [
      {
        url: `${baseUrl}/api/og`,
        width: 1200,
        height: 630,
        alt: "Share Crow - Discover & Share the Best Memes Online",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Share Crow - Discover & Share the Best Memes Online",
    description:
      "Browse, upload, and share hilarious memes with the community. React with emojis, discover trending content, and build your meme collection.",
    images: [`${baseUrl}/api/og`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${creepster.variable} antialiased`}
      >
        <ConvexClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <PWARegister />
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
