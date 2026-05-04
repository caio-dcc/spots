import "server-only";
import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-server";

export const ADMIN_COOKIE = "spt_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8h

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const candidate = scryptSync(password, salt, expected.length);
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export async function findSuperAdminByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from("super_admins")
    .select("id, email, password_hash")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createSession(superAdminId: string, meta?: { userAgent?: string; ip?: string }) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const { error } = await supabaseAdmin.from("super_admin_sessions").insert({
    super_admin_id: superAdminId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    user_agent: meta?.userAgent ?? null,
    ip_address: meta?.ip ?? null,
  });
  if (error) throw error;

  await supabaseAdmin
    .from("super_admins")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", superAdminId);

  return { token, expiresAt };
}

export async function revokeSession(token: string) {
  const tokenHash = hashToken(token);
  await supabaseAdmin.from("super_admin_sessions").delete().eq("token_hash", tokenHash);
}

export async function getSuperAdminFromCookie(): Promise<{ id: string; email: string } | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const { data: session } = await supabaseAdmin
    .from("super_admin_sessions")
    .select("super_admin_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from("super_admin_sessions").delete().eq("token_hash", tokenHash);
    return null;
  }

  const { data: admin } = await supabaseAdmin
    .from("super_admins")
    .select("id, email")
    .eq("id", session.super_admin_id)
    .maybeSingle();

  return admin ?? null;
}

export async function requireSuperAdmin() {
  const admin = await getSuperAdminFromCookie();
  if (!admin) {
    const err = new Error("UNAUTHORIZED_SUPER_ADMIN");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  return admin;
}

export async function setSessionCookie(token: string, expiresAt: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
