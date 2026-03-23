"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Loader2, Upload } from "lucide-react";
import { HomeContent } from "./home-content";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-12 relative">
          <Link href="/">
            <h1 className="text-5xl md:text-7xl font-bold font-creepster">
              Share Crow
            </h1>
          </Link>
          <Link href="/upload" className="absolute right-0">
            <Button variant="outline" className="gap-2">
              <Upload className="size-4" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-64">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          }
        >
          <HomeContent />
        </Suspense>
      </div>
    </main>
  );
}
