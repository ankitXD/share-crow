"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Loader2 } from "lucide-react";
import { StatCards } from "@/components/admin/stat-cards";
import { MemeTable } from "@/components/admin/meme-table";
import { EditMemeDialog } from "@/components/admin/edit-meme-dialog";
import { DeleteMemeDialog } from "@/components/admin/delete-meme-dialog";
import { MemeDetailDrawer } from "@/components/admin/meme-detail-drawer";
import { Id } from "@/convex/_generated/dataModel";

interface MemeWithStats {
  _id: Id<"memes">;
  imageUrl: string;
  imageUrls?: string[];
  description: string;
  shortId: string;
  isNsfw?: boolean;
  uploadedAt: number;
  viewCount: number;
  reactionCount: number;
  commentCount: number;
}

export default function AdminPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const overview = useQuery(api.admin.getAdminOverview);
  const allMemes = useQuery(api.admin.getAllMemesWithStats);

  const [editMeme, setEditMeme] = useState<MemeWithStats | null>(null);
  const [deleteMeme, setDeleteMeme] = useState<MemeWithStats | null>(null);
  const [detailMemeId, setDetailMemeId] = useState<Id<"memes"> | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/upload">
            <Button variant="ghost" size="icon" className="hover:bg-primary/10">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold font-creepster">
            Admin Panel
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                View Site
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {overview ? (
          <StatCards
            totalMemes={overview.totalMemes}
            totalViews={overview.totalViews}
            totalReactions={overview.totalReactions}
            totalComments={overview.totalComments}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-lg bg-card/50 border border-border/50 animate-pulse"
              />
            ))}
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-2xl font-bold font-creepster mb-4">
            Meme Management
          </h2>
          {allMemes ? (
            <MemeTable
              memes={allMemes as unknown as MemeWithStats[]}
              onEdit={setEditMeme}
              onDelete={setDeleteMeme}
              onRowClick={(meme) => setDetailMemeId(meme._id)}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          )}
        </div>

        <EditMemeDialog
          open={!!editMeme}
          onOpenChange={(open) => !open && setEditMeme(null)}
          meme={editMeme}
        />
        <DeleteMemeDialog
          open={!!deleteMeme}
          onOpenChange={(open) => !open && setDeleteMeme(null)}
          meme={deleteMeme}
        />
        <MemeDetailDrawer
          open={!!detailMemeId}
          onOpenChange={(open) => !open && setDetailMemeId(null)}
          memeId={detailMemeId}
        />
      </div>
    </main>
  );
}
