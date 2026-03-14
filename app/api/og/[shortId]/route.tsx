import { ImageResponse } from "@vercel/og";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "edge";

interface RouteParams {
  params: Promise<{ shortId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { shortId } = await params;

  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
    }

    const convex = new ConvexHttpClient(convexUrl);
    const meme = await convex.query(api.memes.getMemeByShortId, {
      shortId: shortId,
    });

    if (!meme || !meme.imageUrl) {
      throw new Error("Invalid meme data");
    }

    return new ImageResponse(
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "1200px",
          height: "630px",
          backgroundColor: "#000000", // Black background to match theme
        }}
      >
        <img
          src={meme.imageUrl}
          alt={meme.description || "Meme"}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain", // Ensures full image is shown without cropping
          }}
        />
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    // Fallback image if something goes wrong
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "1200px",
          height: "630px",
          backgroundColor: "#000000",
          color: "#ffffff",
          fontSize: "48px",
          fontFamily: "Creepster, sans-serif",
        }}
      >
        Share Crow
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  }
}
