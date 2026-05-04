import { NextRequest, NextResponse } from "next/server";
import {
  findSuperAdminByEmail,
  verifyPassword,
  createSession,
  setSessionCookie,
} from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 400 });
    }

    const admin = await findSuperAdminByEmail(email);
    if (!admin) {
      // Resposta genérica para não vazar enumeração de usuários.
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const ok = verifyPassword(password, admin.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const { token, expiresAt } = await createSession(admin.id, {
      userAgent: req.headers.get("user-agent") ?? undefined,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    });
    await setSessionCookie(token, expiresAt);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/login]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
