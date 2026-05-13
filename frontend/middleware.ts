import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { IS_DB_CONFIGURED } from '@/lib/db'

export default auth((req) => {
  // Skip auth in local dev without a database
  if (!IS_DB_CONFIGURED) return NextResponse.next()

  const isLoggedIn  = !!req.auth
  const { pathname } = req.nextUrl
  const isAuthPage  = pathname === '/login' || pathname === '/signup'

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  // Protect all pages; exclude NextAuth internals, static files, and public assets
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
}
