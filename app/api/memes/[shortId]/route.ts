import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// NEXT_PUBLIC_CONVEX_URL is required and should be set in environment variables
if (!convexUrl) {
  // URL is not set - validation happens in GET handler
}

const convex = new ConvexHttpClient(convexUrl || "");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortId: string }> },
) {
  try {
    if (!convexUrl) {
      return new Response(
        JSON.stringify({ error: "Convex URL not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const { shortId } = await params;

    if (!shortId) {
      return new Response(JSON.stringify({ error: "shortId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const meme = await convex.query(api.memes.getMemeByShortId, {
      shortId: shortId,
    });

    if (!meme) {
      return new Response(JSON.stringify({ error: "Meme not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return Response.json(meme, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error fetching meme:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
