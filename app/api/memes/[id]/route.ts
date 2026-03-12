import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const meme = await convex.query(api.memes.getMeme, {
      id: id as Id<"memes">,
    });

    if (!meme) {
      return new Response("Meme not found", { status: 404 });
    }

    return Response.json(meme);
  } catch (error) {
    return new Response("Error fetching meme", { status: 500 });
  }
}
