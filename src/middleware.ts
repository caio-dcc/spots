import { NextResponse, NextRequest } from "next/server";

/** Middleware neutro: fluxos de cliente (/login, /meus-pedidos, etc.) não devem ser redirecionados ao painel do organizador. */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
