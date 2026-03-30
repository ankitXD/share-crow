import { NextRequest, NextResponse } from "next/server";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { convexClient } from "@/lib/convex-server";
import { api } from "convex/_generated/api";

const SESSION_COOKIE = "session_token";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

// In-memory rate limiter with size cap and periodic cleanup.
// Note: In serverless (Vercel), this is per-isolate and not shared across instances.
// For stronger protection, use a persistent store (Redis/Upstash).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 10; // 10 attempts per minute
const MAX_RATE_LIMIT_ENTRIES = 10000;

function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

function checkRateLimit(ip: string, action: string): boolean {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    // Evict stale entries if map is too large
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      cleanupRateLimitMap();
    }
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }

  entry.count++;
  return true;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashBuffer = Buffer.from(hash, "hex");
  const suppliedBuffer = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, suppliedBuffer);
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function createSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const action = pathSegments[pathSegments.length - 1];

  // Rate limit sign-in and sign-up attempts
  if (action === "signin" || action === "signup") {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (!checkRateLimit(ip, action)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }
  }

  if (action === "signup") {
    if (process.env.VERCEL) {
      return NextResponse.json(
        { error: "Sign up is disabled" },
        { status: 403 },
      );
    }
    return handleSignUp(request);
  } else if (action === "signin") {
    return handleSignIn(request);
  } else if (action === "signout") {
    return handleSignOut(request);
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const action = pathSegments[pathSegments.length - 1];

  if (action === "session") {
    return handleGetSession(request);
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

async function handleSignUp(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const passwordHash = hashPassword(password);

    let userId;
    try {
      userId = await convexClient.mutation(api.users.createUser, {
        email,
        name,
        passwordHash,
        serverSecret: process.env.SERVER_SECRET!,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create user";
      if (message.includes("already exists")) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 409 },
        );
      }
      throw error;
    }

    const token = generateToken();
    const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;

    await convexClient.mutation(api.users.createSession, {
      userId,
      token,
      expiresAt,
      serverSecret: process.env.SERVER_SECRET!,
    });

    const response = NextResponse.json({ success: true });
    response.headers.set("Set-Cookie", createSessionCookie(token));
    return response;
  } catch (error) {
    console.error("Sign up error:", error);
    const message = error instanceof Error ? error.message : "Sign up failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleSignIn(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const user = await convexClient.query(api.users.getUserByEmailInternal, {
      email,
      serverSecret: process.env.SERVER_SECRET,
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (
      !("passwordHash" in user) ||
      !verifyPassword(password, user.passwordHash)
    ) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const token = generateToken();
    const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;

    await convexClient.mutation(api.users.createSession, {
      userId: user._id,
      token,
      expiresAt,
      serverSecret: process.env.SERVER_SECRET!,
    });

    const response = NextResponse.json({ success: true });
    response.headers.set("Set-Cookie", createSessionCookie(token));
    return response;
  } catch (error) {
    console.error("Sign in error:", error);
    return NextResponse.json({ error: "Sign in failed" }, { status: 500 });
  }
}

async function handleSignOut(request: NextRequest) {
  // CSRF protection: validate Origin header
  const origin = request.headers.get("origin");
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (origin && siteUrl) {
    const allowedOrigin = new URL(siteUrl).origin;
    if (origin !== allowedOrigin) {
      return NextResponse.json(
        { error: "CSRF validation failed" },
        { status: 403 },
      );
    }
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (token) {
    await convexClient.mutation(api.users.deleteSession, {
      token,
      serverSecret: process.env.SERVER_SECRET!,
    });
  }

  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}

async function handleGetSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ session: null });
  }

  const result = await convexClient.query(api.users.getSessionByToken, {
    token,
  });

  if (!result) {
    const response = NextResponse.json({ session: null });
    response.headers.set("Set-Cookie", clearSessionCookie());
    return response;
  }

  // Return user data and token for Convex function auth.
  // The token is needed client-side for Convex query/mutation auth (e.g., admin panel).
  // XSS risk is mitigated by CSP headers in middleware.
  return NextResponse.json({
    session: { user: result.user, token },
  });
}
