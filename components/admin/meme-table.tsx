/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Search, ArrowUpDown } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

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

type SortField = "uploadedAt" | "viewCount" | "reactionCount" | "commentCount";
type SortDirection = "asc" | "desc";

interface MemeTableProps {
  memes: MemeWithStats[];
  onEdit: (meme: MemeWithStats) => void;
  onDelete: (meme: MemeWithStats) => void;
  onRowClick: (meme: MemeWithStats) => void;
}

export function MemeTable({
  memes,
  onEdit,
  onDelete,
  onRowClick,
}: MemeTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("uploadedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = memes;

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.description.toLowerCase().includes(query) ||
          m.shortId.toLowerCase().includes(query),
      );
    }

    result = [...result].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [memes, search, sortField, sortDirection]);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      <ArrowUpDown
        className={`size-3 ${sortField === field ? "text-primary" : ""}`}
      />
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by description or shortId..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-background/50"
        />
      </div>

      <div className="rounded-lg border border-border/50 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24">ShortId</TableHead>
              <TableHead className="w-20">
                <SortButton field="viewCount">Views</SortButton>
              </TableHead>
              <TableHead className="w-24">
                <SortButton field="reactionCount">Reactions</SortButton>
              </TableHead>
              <TableHead className="w-24">
                <SortButton field="commentCount">Comments</SortButton>
              </TableHead>
              <TableHead className="w-16">NSFW</TableHead>
              <TableHead className="w-28">
                <SortButton field="uploadedAt">Date</SortButton>
              </TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground"
                >
                  {search ? "No memes match your search" : "No memes yet"}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSorted.map((meme) => (
                <TableRow
                  key={meme._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick(meme)}
                >
                  <TableCell>
                    <img
                      src={meme.imageUrl}
                      alt=""
                      className="size-10 rounded object-cover"
                    />
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-medium">
                    {meme.description}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/meme/${meme.shortId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary hover:underline font-mono text-xs"
                    >
                      {meme.shortId}
                    </Link>
                  </TableCell>
                  <TableCell>{meme.viewCount}</TableCell>
                  <TableCell>{meme.reactionCount}</TableCell>
                  <TableCell>{meme.commentCount}</TableCell>
                  <TableCell>
                    {meme.isNsfw ? (
                      <Badge variant="destructive" className="text-xs">
                        NSFW
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(meme.uploadedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(meme);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(meme);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground text-right">
        {filteredAndSorted.length} of {memes.length} memes
      </div>
    </div>
  );
}
