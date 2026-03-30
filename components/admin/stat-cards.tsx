"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Eye, SmilePlus, MessageSquare } from "lucide-react";

interface StatCardsProps {
  totalMemes: number;
  totalViews: number;
  totalReactions: number;
  totalComments: number;
}

export function StatCards({
  totalMemes,
  totalViews,
  totalReactions,
  totalComments,
}: StatCardsProps) {
  const stats = [
    { label: "Total Memes", value: totalMemes, icon: ImageIcon },
    { label: "Total Views", value: totalViews, icon: Eye },
    { label: "Total Reactions", value: totalReactions, icon: SmilePlus },
    { label: "Total Comments", value: totalComments, icon: MessageSquare },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
            <stat.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stat.value.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
