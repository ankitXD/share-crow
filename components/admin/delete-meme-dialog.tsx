/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DeleteMemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meme: {
    _id: Id<"memes">;
    description: string;
    imageUrl: string;
  } | null;
  sessionToken: string;
}

export function DeleteMemeDialog({
  open,
  onOpenChange,
  meme,
  sessionToken,
}: DeleteMemeDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMeme = useMutation(api.admin.deleteMeme);

  const handleDelete = async () => {
    if (!meme) return;
    setIsDeleting(true);
    try {
      await deleteMeme({ memeId: meme._id, sessionToken });
      toast.success("Meme deleted");
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete meme");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Meme</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the meme
            and all its reactions, views, and comments.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {meme && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <img
              src={meme.imageUrl}
              alt=""
              className="size-12 rounded object-cover"
            />
            <p className="text-sm text-muted-foreground line-clamp-2">
              {meme.description}
            </p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="size-4 mr-2 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
