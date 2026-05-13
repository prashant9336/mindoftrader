import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export default NextAuth(authConfig).auth

export const config = {
  // Protect all pages; exclude NextAuth internals, static files, and public assets
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
}
