"use client";

import { useState } from "react";
import { Share2, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface MemeCardProps {
  shortId: string;
  imageUrl: string;
  description: string;
  isNsfw?: boolean;
}

export function MemeCard({
  shortId,
  imageUrl,
  description,
  isNsfw,
}: MemeCardProps) {
  const [showNsfw, setShowNsfw] = useState(false);
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
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `meme-${shortId}.jpg`;
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
            <img
              src={imageUrl}
              alt={description}
              className="w-full h-72 object-contain object-center transition-transform duration-500 group-hover:scale-105"
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
        <CardFooter className="flex flex-col gap-4 p-4 bg-linear-to-b from-card/80 to-card">
          <CardDescription className="text-muted-foreground/90 line-clamp-2 text-sm leading-relaxed w-full">
            {description}
          </CardDescription>
          <div className="flex items-center justify-end gap-2 w-full">
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
        </CardFooter>
      </Card>
    </Link>
  );
}
