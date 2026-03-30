"use client";

import { useState, useEffect, useCallback } from "react";

interface User {
  _id: string;
  email: string;
  name: string;
}

interface SessionData {
  user: User;
  token: string;
}

interface AuthResult {
  error: { message: string } | null;
}

export function useSession() {
  const [data, setData] = useState<SessionData | null>(null);
  const [isPending, setIsPending] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const json = await res.json();
      setData(
        json.session
          ? { user: json.session.user, token: json.session.token }
          : null,
      );
    } catch {
      setData(null);
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return { data, isPending };
}

export const signIn = {
  email: async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<AuthResult> => {
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { error: { message: json.error || "Sign in failed" } };
      }
      return { error: null };
    } catch {
      return { error: { message: "Sign in failed" } };
    }
  },
};

export const signUp = {
  email: async ({
    email,
    password,
    name,
  }: {
    email: string;
    password: string;
    name: string;
  }): Promise<AuthResult> => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { error: { message: json.error || "Sign up failed" } };
      }
      return { error: null };
    } catch {
      return { error: { message: "Sign up failed" } };
    }
  },
};

export async function signOut(): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST" });
}
