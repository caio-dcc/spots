import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_APP_URL;

export function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  const normalized = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.slice(0, maxLen);
}

export function getRequestIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function enforceSameOrigin(req: NextRequest): NextResponse | null {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return null;
  }

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) {
    return NextResponse.json({ error: "origem invalida" }, { status: 403 });
  }

  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ error: "origem invalida" }, { status: 403 });
  }

  const expectedHost = PUBLIC_BASE_URL ? new URL(PUBLIC_BASE_URL).host : host;
  if (originHost !== expectedHost) {
    return NextResponse.json({ error: "csrf blocked" }, { status: 403 });
  }

  return null;
}

export async function getUserFromBearer(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "missing_token" as const };
  }

  const token = authHeader.substring(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { user: null, error: "unauthorized" as const };
  return { user: { id: user.id, email: user.email ?? null }, error: null };
}
