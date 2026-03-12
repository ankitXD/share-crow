import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// NEXT_PUBLIC_CONVEX_URL is required and should be set in environment variables
if (!convexUrl) {
  // URL is not set - validation happens in GET handler
}

const convex = new ConvexHttpClient(convexUrl || "");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!convexUrl) {
      return new Response(
        JSON.stringify({ error: "Convex URL not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const { id } = await params;

    if (!id) {
      return new Response(JSON.stringify({ error: "ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const meme = await convex.query(api.memes.getMeme, {
      id: id as Id<"memes">,
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
    return new Response(JSON.stringify({ error: "Error fetching meme" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
