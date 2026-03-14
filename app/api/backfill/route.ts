import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
}

const convex = new ConvexHttpClient(convexUrl);

export async function POST(_request: NextRequest) {
  try {
    const result = await convex.mutation(api.memes.backfillMemes, {});

    return NextResponse.json({
      success: true,
      message: result,
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Backfill failed",
      },
      { status: 500 },
    );
  }
}
