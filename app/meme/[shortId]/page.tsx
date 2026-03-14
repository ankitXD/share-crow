import { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { MemeClient } from "./meme-client";

interface PageProps {
  params: Promise<{ shortId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { shortId } = await params;

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
    }

    // Use ConvexHttpClient to query directly
    const convex = new ConvexHttpClient(convexUrl);
    const meme = await convex.query(api.memes.getMemeByShortId, {
      shortId: shortId,
    });

    if (!meme || !meme.imageUrl) {
      throw new Error("Invalid meme data");
    }

    return {
      title: `Share Crow - ${meme.description || "Meme"}`,
      description: meme.description || "Check out this meme on Share Crow!",
      metadataBase: new URL(baseUrl),
      openGraph: {
        title: `Share Crow - ${meme.description || "Meme"}`,
        description: meme.description || "Check out this meme on Share Crow!",
        images: [
          {
            url: `${baseUrl}/api/og/${shortId}`,
            width: 1200,
            height: 630,
            alt: meme.description || "Meme",
            type: "image/png",
          },
        ],
        type: "website",
        url: `${baseUrl}/meme/${shortId}`,
      },
      twitter: {
        card: "summary_large_image",
        title: `Share Crow - ${meme.description || "Meme"}`,
        description: meme.description || "Check out this meme on Share Crow!",
        images: [`${baseUrl}/api/og/${shortId}`],
      },
    };
  } catch (error) {
    // Fallback metadata if fetch fails
    return {
      title: `Share Crow - Meme`,
      description: "Check out this meme on Share Crow!",
      metadataBase: new URL(baseUrl),
    };
  }
}

export default async function MemePage({ params }: PageProps) {
  const { shortId } = await params;

  return <MemeClient shortId={shortId} />;
}
