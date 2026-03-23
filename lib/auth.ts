import { convexClient } from "@/lib/convex-server";
import { api } from "convex/_generated/api";

const SESSION_COOKIE = "session_token";

export async function getServerSession(cookies: {
  get(name: string): { value: string } | undefined;
}) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const result = await convexClient.query(api.users.getSessionByToken, {
    token,
  });
  return result;
}
