"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  ImagePlus,
  X,
  ArrowLeft,
  Loader2,
  LogOut,
  GripVertical,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const MAX_IMAGES = 10;

interface ImageItem {
  file: File;
  preview: string;
}

export default function UploadPage() {
  const { data: session, isPending } = useSession();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [description, setDescription] = useState("");
  const [isNsfw, setIsNsfw] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const addMeme = useMutation(api.memes.addMeme);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (newFiles.length === 0) {
      toast.error("Please select image files");
      return;
    }

    setImages((prev) => {
      const remaining = MAX_IMAGES - prev.length;
      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_IMAGES} images allowed`);
        return prev;
      }
      const toAdd = newFiles.slice(0, remaining);
      if (newFiles.length > remaining) {
        toast.warning(`Only ${remaining} more image(s) can be added`);
      }
      const newItems: ImageItem[] = toAdd.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      return [...prev, ...newItems];
    });
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        addFiles(pastedFiles);
        toast.success("Image pasted successfully!");
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addFiles]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isPending) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!session) {
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
    // Reset so the same file can be selected again
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Drag-to-reorder handlers
  const handleReorderDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleReorderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleReorderDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    setImages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(draggedIndex, 1);
      updated.splice(dropIndex, 0, moved);
      return updated;
    });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleReorderDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      toast.error("Please select at least one image");
      return;
    }
    if (!description.trim()) {
      toast.error("Please add a description");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      for (const img of images) {
        formData.append("files", img.file);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      const urls: string[] = data.secure_urls;

      await addMeme({
        imageUrl: urls[0],
        imageUrls: urls.length > 1 ? urls : undefined,
        description: description.trim(),
        isNsfw,
      });

      toast.success("Meme uploaded successfully!");
      clearAll();
      setDescription("");
      setIsNsfw(false);

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to upload meme. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover:bg-primary/10">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold font-creepster">
            Upload Meme
          </h1>
          <div className="ml-auto">
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="image" className="text-lg font-medium">
                    Meme Image{images.length > 1 ? "s" : ""}
                  </Label>
                  {images.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {images.length}/{MAX_IMAGES} images
                    </span>
                  )}
                </div>

                {images.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-border/70 rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <ImagePlus className="size-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-foreground">
                          Drop your meme here
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          or click to browse
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground/70">
                        Supports JPG, PNG, GIF, WebP &bull; Up to {MAX_IMAGES}{" "}
                        images
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Main preview - first image */}
                    <div className="relative group">
                      <img
                        src={images[0].preview}
                        alt="Cover preview"
                        className="w-full h-80 object-contain rounded-xl bg-black/20"
                      />
                      {images.length > 1 && (
                        <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                          1/{images.length}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={clearAll}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Clear All
                      </Button>
                    </div>

                    {/* Thumbnail strip */}
                    <div
                      className="flex gap-2 overflow-x-auto pb-1"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                    >
                      {images.map((img, index) => (
                        <div
                          key={img.preview}
                          draggable
                          onDragStart={() => handleReorderDragStart(index)}
                          onDragOver={(e) => handleReorderDragOver(e, index)}
                          onDrop={(e) => handleReorderDrop(e, index)}
                          onDragEnd={handleReorderDragEnd}
                          className={`relative group/thumb shrink-0 w-10 h-10 rounded-md overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
                            dragOverIndex === index && draggedIndex !== index
                              ? "border-primary scale-105"
                              : index === 0
                                ? "border-primary/50"
                                : "border-border/50"
                          } ${draggedIndex === index ? "opacity-50" : ""}`}
                        >
                          <img
                            src={img.preview}
                            alt={`Image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/40 transition-colors" />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                          >
                            <X className="size-3" />
                          </button>
                          {index === 0 && (
                            <span className="absolute bottom-0.5 left-0.5 bg-primary text-primary-foreground text-[9px] px-1 rounded">
                              Cover
                            </span>
                          )}
                          <GripVertical className="absolute top-0.5 left-0.5 size-3 text-white/70 opacity-0 group-hover/thumb:opacity-100 transition-opacity" />
                        </div>
                      ))}

                      {/* Add more button */}
                      {images.length < MAX_IMAGES && (
                        <button
                          type="button"
                          onClick={() => addMoreInputRef.current?.click()}
                          className="shrink-0 w-10 h-10 rounded-md border-2 border-dashed border-border/70 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center"
                        >
                          <Plus className="size-5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Drag thumbnails to reorder &bull; First image is the cover
                    </p>
                  </div>
                )}

                <Input
                  ref={fileInputRef}
                  id="image"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Input
                  ref={addMoreInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Label htmlFor="description" className="text-lg font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="What's the story behind this meme?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-30 resize-none bg-background/50 border-border/50 focus:border-primary/50"
                />
                <p className="text-xs text-muted-foreground">
                  Keep it short and funny for maximum impact
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="nsfw" className="text-lg font-medium">
                    NSFW Content
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Mark this meme as Not Safe For Work
                  </p>
                </div>
                <Switch
                  id="nsfw"
                  checked={isNsfw}
                  onCheckedChange={setIsNsfw}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            disabled={isUploading || images.length === 0}
            className="w-full text-lg font-medium"
          >
            {isUploading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="size-5 mr-2" />
                Upload Meme
              </>
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
