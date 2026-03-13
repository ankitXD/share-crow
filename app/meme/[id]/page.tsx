import { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MemeClient } from "./meme-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;

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
    const meme = await convex.query(api.memes.getMeme, {
      id: id as Id<"memes">,
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
            url: meme.imageUrl,
            width: 1200,
            height: 630,
            alt: meme.description || "Meme",
            type: "image/jpeg",
          },
        ],
        type: "website",
        url: `${baseUrl}/meme/${id}`,
      },
      twitter: {
        card: "summary_large_image",
        title: `Share Crow - ${meme.description || "Meme"}`,
        description: meme.description || "Check out this meme on Share Crow!",
        images: [meme.imageUrl],
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
  const { id } = await params;

  return <MemeClient id={id} />;
}
