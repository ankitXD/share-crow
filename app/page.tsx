"use client";

import { MemeCard } from "@/components/meme-card";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const result = useQuery(api.memes.getMemesWithPagination, { page });

  const memes = result?.memes;
  const totalPages = result?.totalPages || 0;
  const currentPage = result?.currentPage || 1;

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = page + 1;
      router.push(`?page=${newPage}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = page - 1;
      router.push(`?page=${newPage}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePageChange = (newPage: number) => {
    router.push(`?page=${newPage}`);
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

        {result === undefined ? (
          <div className="flex items-center justify-center min-h-64">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : memes && memes.length === 0 && currentPage === 1 ? (
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {memes?.map((meme) => (
                <MemeCard
                  key={meme._id}
                  shortId={meme.shortId}
                  imageUrl={meme.imageUrl}
                  description={meme.description}
                  isNsfw={meme.isNsfw}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Page</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const newPage = Math.max(
                        1,
                        Math.min(totalPages, parseInt(e.target.value) || 1),
                      );
                      handlePageChange(newPage);
                    }}
                    className="w-12 px-2 py-1 bg-muted text-foreground border border-border rounded text-center text-sm"
                  />
                  <span className="text-sm text-muted-foreground">
                    of {totalPages}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage >= totalPages}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
