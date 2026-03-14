import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center space-y-8">
        {/* 404 Header */}
        <div className="space-y-4">
          <div className="text-9xl md:text-[150px] font-bold font-creepster leading-none">
            404
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-creepster">
            Meme Not Found
          </h1>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <p className="text-lg text-muted-foreground">
            The crow flew away with this page! 🐦
          </p>
          <p className="text-base text-muted-foreground">
            It seems this meme doesn't exist or has been deleted. Don't worry,
            there are plenty of other hilarious memes waiting for you.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto">
              Back to Home
            </Button>
          </Link>
          <Link href="/">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Browse Memes
            </Button>
          </Link>
        </div>

        {/* Fun ASCII Art */}
        <div className="pt-8 text-muted-foreground text-sm font-mono space-y-1">
          <pre>
            {`    ^__^
    (oo)\\_______
    (__)\\       )\\/\\
        ||----w |
        ||     ||`}
          </pre>
          <p className="text-xs">The crow that got away...</p>
        </div>
      </div>
    </main>
  );
}
