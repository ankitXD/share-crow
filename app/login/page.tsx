"use client";

import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const isDev = process.env.NODE_ENV === "development";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp.email({
          email,
          password,
          name,
        });
        if (error) {
          toast.error(error.message || "Sign up failed");
          return;
        }
        toast.success("Account created! You are now logged in.");
        router.push("/upload");
      } else {
        const { error } = await signIn.email({
          email,
          password,
        });
        if (error) {
          toast.error(error.message || "Sign in failed");
          return;
        }
        toast.success("Signed in!");
        router.push("/upload");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/">
            <h1 className="text-5xl font-bold font-creepster">Share Crow</h1>
          </Link>
          <p className="text-muted-foreground mt-2">
            {isSignUp
              ? "Create an account to upload memes"
              : "Authorized personnel only. If your humour isn't good, you don't belong here."}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isSignUp ? "Sign Up" : "Sign In"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  minLength={8}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>

            {isDev ? (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {isSignUp ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="text-foreground underline underline-offset-4 hover:text-primary"
                    >
                      Sign In
                    </button>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="text-foreground underline underline-offset-4 hover:text-primary"
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            ) : (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Public sign-up is disabled. Admin access only.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
