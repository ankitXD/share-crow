import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convex-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortId: string }> },
) {
  try {
    const { shortId } = await params;

    if (!shortId) {
      return new Response(JSON.stringify({ error: "shortId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const meme = await convexClient.query(api.memes.getMemeByShortId, {
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
