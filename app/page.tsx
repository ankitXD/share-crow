import { MemeCard } from "@/components/meme-card";

// Static meme data for now
const memes = [
  {
    id: "1",
    imageUrl: "https://picsum.photos/seed/meme1/400/300",
    description: "When the code works on the first try",
  },
  {
    id: "2",
    imageUrl: "https://picsum.photos/seed/meme2/400/300",
    description: "Me explaining to my rubber duck why the bug exists",
  },
  {
    id: "3",
    imageUrl: "https://picsum.photos/seed/meme3/400/300",
    description: "Friday deploy be like...",
  },
  {
    id: "4",
    imageUrl: "https://picsum.photos/seed/meme4/400/300",
    description: "Stack Overflow saves the day again",
  },
  {
    id: "5",
    imageUrl: "https://picsum.photos/seed/meme5/400/300",
    description: "It works on my machine",
  },
  {
    id: "6",
    imageUrl: "https://picsum.photos/seed/meme6/400/300",
    description: "When you finally understand recursion",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-5xl md:text-7xl font-bold text-center mb-12 font-creepster">
          Share Crow
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memes.map((meme) => (
            <MemeCard
              key={meme.id}
              id={meme.id}
              imageUrl={meme.imageUrl}
              description={meme.description}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
