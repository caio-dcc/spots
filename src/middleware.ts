import { NextResponse, NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas bloqueadas para clientes (redirecionar para house/login ou home)
  const blockedRoutes = [
    '/login',
    '/registrar',
    '/auth-selection',
    '/mosaico-eventos',
    '/meus-pedidos'
  ]

  if (blockedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/house/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/login/:path*',
    '/registrar/:path*',
    '/auth-selection/:path*',
    '/mosaico-eventos/:path*',
    '/meus-pedidos/:path*'
  ],
}
