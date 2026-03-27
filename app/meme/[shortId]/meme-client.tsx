"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import { Share2, Download, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ReactionBar } from "@/components/reaction-bar";
import { CommentSection } from "@/components/comment-section";
import { getFingerprint } from "@/lib/fingerprint";
import Link from "next/link";

interface MemeClientProps {
  shortId: string;
}

function formatCount(n: number): string {
  if (n >= 1000)
    return Intl.NumberFormat("en", { notation: "compact" }).format(n);
  return String(n);
}

export function MemeClient({ shortId }: MemeClientProps) {
  const meme = useQuery(api.memes.getMemeByShortId, { shortId });
  const adjacent = useQuery(api.memes.getAdjacentMemes, { shortId });
  const [fingerprint, setFingerprint] = useState("");
  const recordView = useMutation(api.views.recordView);

  useEffect(() => {
    setFingerprint(getFingerprint());
  }, []);

  // Record view on mount
  useEffect(() => {
    if (meme && fingerprint) {
      recordView({ memeId: meme._id, fingerprint });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meme?._id, fingerprint]);

  const reactions = useQuery(
    api.reactions.getReactionsForMeme,
    meme ? { memeId: meme._id, fingerprint: fingerprint || undefined } : "skip",
  );

  if (meme === undefined) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!meme) {
    notFound();
  }

  const handleShare = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    toast("Link Copied");
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(meme.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sharecrow-${shortId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast("Download Started");
    } catch {
      toast.error("Failed to download");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-12">
          <Link href="/">
            <h1 className="text-5xl md:text-7xl font-bold font-creepster">
              Share Crow
            </h1>
          </Link>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="relative w-full flex justify-center">
            <Image
              src={meme.imageUrl}
              alt={meme.description}
              width={800}
              height={600}
              className="w-full h-auto max-h-screen object-contain shadow-2xl"
              priority
            />
          </div>
          <div className="mt-6 flex flex-col gap-4">
            <p className="text-muted-foreground text-center text-lg">
              {meme.description}
            </p>
            <div className="flex items-center justify-center text-sm text-muted-foreground gap-1">
              <Eye className="size-4" />
              {formatCount(meme.viewCount ?? 0)} views
            </div>
            <div className="flex justify-center">
              <ReactionBar
                memeId={meme._id}
                counts={reactions?.counts ?? []}
                userReaction={reactions?.userReaction ?? null}
                size="lg"
              />
            </div>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="size-5" />
                Download
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={handleShare}
                className="gap-2"
              >
                <Share2 className="size-5" />
                Share
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                disabled={!adjacent?.prevShortId}
                asChild={!!adjacent?.prevShortId}
              >
                {adjacent?.prevShortId ? (
                  <Link href={`/meme/${adjacent.prevShortId}`}>
                    <ChevronLeft className="size-5" />
                    Previous Meme
                  </Link>
                ) : (
                  <>
                    <ChevronLeft className="size-5" />
                    Previous Meme
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                disabled={!adjacent?.nextShortId}
                asChild={!!adjacent?.nextShortId}
              >
                {adjacent?.nextShortId ? (
                  <Link href={`/meme/${adjacent.nextShortId}`}>
                    Next Meme
                    <ChevronRight className="size-5" />
                  </Link>
                ) : (
                  <>
                    Next Meme
                    <ChevronRight className="size-5" />
                  </>
                )}
              </Button>
            </div>
            <div className="mt-8">
              <CommentSection memeId={meme._id} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
