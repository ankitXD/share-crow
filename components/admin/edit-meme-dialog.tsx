/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditMemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meme: {
    _id: Id<"memes">;
    description: string;
    isNsfw?: boolean;
    imageUrl: string;
  } | null;
}

export function EditMemeDialog({
  open,
  onOpenChange,
  meme,
}: EditMemeDialogProps) {
  const [description, setDescription] = useState("");
  const [isNsfw, setIsNsfw] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const updateMeme = useMutation(api.admin.updateMeme);

  useEffect(() => {
    if (meme) {
      setDescription(meme.description);
      setIsNsfw(meme.isNsfw ?? false);
    }
  }, [meme]);

  const handleSave = async () => {
    if (!meme) return;
    setIsSaving(true);
    try {
      await updateMeme({
        memeId: meme._id,
        description: description.trim(),
        isNsfw,
      });
      toast.success("Meme updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update meme");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Meme</DialogTitle>
        </DialogHeader>
        {meme && (
          <div className="space-y-4">
            <img
              src={meme.imageUrl}
              alt=""
              className="w-full h-48 object-contain rounded-lg bg-black/20"
            />
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-nsfw">NSFW Content</Label>
              <Switch
                id="edit-nsfw"
                checked={isNsfw}
                onCheckedChange={setIsNsfw}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !description.trim()}
          >
            {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
