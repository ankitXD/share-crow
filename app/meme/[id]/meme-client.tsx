"use client";

import React from "react";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { notFound } from "next/navigation";
import { Share2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface MemeClientProps {
  id: string;
}

export function MemeClient({ id }: MemeClientProps) {
  const meme = useQuery(api.memes.getMeme, { id: id as Id<"memes"> });

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
      link.download = `meme-${id}.jpg`;
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
          </div>
        </div>
      </div>
    </main>
  );
}
