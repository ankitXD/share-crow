"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { HomeContent } from "./home-content";

export default function Home() {
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
