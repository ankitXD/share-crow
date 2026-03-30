/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  aspectRatio?: "card" | "full";
  onSlideChange?: (index: number) => void;
}

export function ImageCarousel({
  images,
  alt,
  className,
  aspectRatio = "card",
  onSlideChange,
}: ImageCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      const index = api.selectedScrollSnap();
      setCurrent(index);
      onSlideChange?.(index);
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSlideChange]);

  if (images.length === 1) {
    return (
      <img
        src={images[0]}
        alt={alt}
        className={cn(
          aspectRatio === "card"
            ? "w-full h-72 object-contain object-center"
            : "w-full h-auto max-h-screen object-contain shadow-2xl",
          className,
        )}
      />
    );
  }

  return (
    <div className="relative group/carousel">
      <Carousel
        setApi={setApi}
        opts={{ loop: false }}
        className={cn("w-full", className)}
      >
        <CarouselContent className="ml-0">
          {images.map((url, i) => (
            <CarouselItem key={url} className="pl-0">
              <img
                src={url}
                alt={`${alt} - ${i + 1}`}
                className={
                  aspectRatio === "card"
                    ? "w-full h-72 object-contain object-center"
                    : "w-full h-auto max-h-screen object-contain shadow-2xl"
                }
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 size-8 bg-black/60 hover:bg-black/80 border-0 text-white opacity-70 group-hover/carousel:opacity-100 transition-opacity" />
        <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 size-8 bg-black/60 hover:bg-black/80 border-0 text-white opacity-70 group-hover/carousel:opacity-100 transition-opacity" />
      </Carousel>

      {/* Image counter badge */}
      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
        {current + 1}/{images.length}
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              api?.scrollTo(i);
            }}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              current === i ? "bg-white w-3" : "bg-white/40 hover:bg-white/60",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Get all images for a meme (works for both old and new memes) */
export function getMemeImages(meme: {
  imageUrl: string;
  imageUrls?: string[];
}): string[] {
  if (meme.imageUrls && meme.imageUrls.length > 0) {
    return meme.imageUrls;
  }
  return [meme.imageUrl];
}
