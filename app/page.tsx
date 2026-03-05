"use client";

import { MemeCard } from "@/components/meme-card";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const memes = useQuery(api.memes.getMemes);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold font-creepster">
            Share Crow
          </h1>
        </div>

        {memes === undefined ? (
          <div className="flex items-center justify-center min-h-64">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : memes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-muted-foreground mb-6">
              No memes yet. Be the first to share one!
            </p>
            <Link href="/upload">
              <Button size="lg" className="gap-2">
                <Upload className="size-5" />
                Upload First Meme
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memes.map((meme) => (
              <MemeCard
                key={meme._id}
                id={meme._id}
                imageUrl={meme.imageUrl}
                description={meme.description}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
