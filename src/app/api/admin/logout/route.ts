import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, clearSessionCookie, revokeSession } from "@/lib/admin-auth";

export async function POST() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) await revokeSession(token);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
