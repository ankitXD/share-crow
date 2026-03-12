import { Metadata, ResolvingMetadata } from "next";
import { MemeClient } from "./meme-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id } = await params;

  try {
    // Fetch meme data from your API
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/memes/${id}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch meme");
    }

    const meme = await res.json();

    return {
      title: `Share Crow - ${meme.description || "Meme"}`,
      description: meme.description || "Check out this meme on Share Crow!",
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
      title: "Share Crow - Meme",
      description: "Check out this meme on Share Crow!",
    };
  }
}

export default async function MemePage({ params }: PageProps) {
  const { id } = await params;

  return <MemeClient id={id} />;
}
