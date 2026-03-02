"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MemeCardProps {
  id: string;
  imageUrl: string;
  description: string;
}

export function MemeCard({ id, imageUrl, description }: MemeCardProps) {
  const handleShare = async () => {
    const url = `${window.location.origin}/meme/${id}`;
    await navigator.clipboard.writeText(url);
    toast("Link Copied");
  };

  return (
    <Card className="overflow-hidden bg-card border-border">
      <CardContent className="p-0">
        <img
          src={imageUrl}
          alt={description}
          className="w-full h-64 object-cover"
        />
      </CardContent>
      <CardFooter className="flex items-center justify-between py-4">
        <CardDescription className="text-muted-foreground line-clamp-2 flex-1 mr-4">
          {description}
        </CardDescription>
        <Button
          variant="outline"
          size="icon"
          onClick={handleShare}
          aria-label="Share meme"
        >
          <Share2 className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
