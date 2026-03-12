"use client";

import { useState, useRef } from "react";
import { Upload, ImagePlus, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function UploadPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const addMeme = useMutation(api.memes.addMeme);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const clearPreview = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select an image");
      return;
    }
    if (!description.trim()) {
      toast.error("Please add a description");
      return;
    }

    setIsUploading(true);

    try {
      // Upload to our API
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Upload error:", data);
        const errorMessage = data.error || "Failed to upload image";
        throw new Error(errorMessage);
      }
      const imageUrl = data.secure_url;

      // Save to Convex
      await addMeme({
        imageUrl,
        description: description.trim(),
      });

      toast.success("Meme uploaded successfully!");
      setPreview(null);
      setSelectedFile(null);
      setDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Redirect to home page after 1 second
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);
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
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Label htmlFor="image" className="text-lg font-medium">
                  Meme Image
                </Label>

                {!preview ? (
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
                        Supports JPG, PNG, GIF, WebP
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <Image
                      src={preview}
                      alt="Preview"
                      width={800}
                      height={320}
                      className="w-full h-80 object-contain rounded-xl bg-black/20"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={clearPreview}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                )}

                <Input
                  ref={fileInputRef}
                  id="image"
                  type="file"
                  accept="image/*"
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

          <Button
            type="submit"
            size="lg"
            disabled={isUploading || !preview}
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
