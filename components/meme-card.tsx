/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { Share2, Download, Eye, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReactionBar } from "@/components/reaction-bar";
import { ImageCarousel, getMemeImages } from "@/components/image-carousel";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

interface MemeCardProps {
  memeId: Id<"memes">;
  shortId: string;
  imageUrl: string;
  imageUrls?: string[];
  description: string;
  isNsfw?: boolean;
  viewCount: number;
  commentCount: number;
  reactionCounts: Array<{ emoji: string; count: number }>;
  userReaction: string | null;
}

function formatCount(n: number): string {
  if (n >= 1000)
    return Intl.NumberFormat("en", { notation: "compact" }).format(n);
  return String(n);
}

export function MemeCard({
  memeId,
  shortId,
  imageUrl,
  imageUrls,
  description,
  isNsfw,
  viewCount,
  commentCount,
  reactionCounts,
  userReaction,
}: MemeCardProps) {
  const [showNsfw, setShowNsfw] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = getMemeImages({ imageUrl, imageUrls });
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/meme/${shortId}`;
    await navigator.clipboard.writeText(url);
    toast("Link Copied");
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(images[currentIndex]);
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
    <Link href={`/meme/${shortId}`}>
      <Card className="group overflow-hidden bg-card/50 border-border/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer">
        <CardContent className="p-0 relative">
          <div className="overflow-hidden relative">
            <ImageCarousel
              images={images}
              alt={description}
              aspectRatio="card"
              onSlideChange={setCurrentIndex}
            />
            {isNsfw && !showNsfw && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="text-sm font-semibold text-white">
                    NSFW Content
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowNsfw(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white text-sm transition-colors"
                  >
                    <Eye className="size-4" />
                    Show
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </CardContent>
        <CardFooter className="flex flex-col gap-3 p-4 bg-linear-to-b from-card/80 to-card">
          <CardDescription className="text-muted-foreground/90 line-clamp-2 text-sm leading-relaxed w-full">
            {description}
          </CardDescription>
          <div className="w-full">
            <ReactionBar
              memeId={memeId}
              counts={reactionCounts ?? []}
              userReaction={userReaction ?? null}
              size="sm"
            />
          </div>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="size-3.5" />
                {formatCount(viewCount)}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3.5" />
                {commentCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                aria-label="Download meme"
              >
                <Download className="size-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="border-primary/30 hover:border-primary hover:bg-primary/10 hover:text-primary transition-colors"
                aria-label="Share meme"
              >
                <Share2 className="size-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
