import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // Skip auth enforcement in local dev without a database
      if (!process.env.POSTGRES_URL) return true

      const isLoggedIn = !!auth?.user
      const { pathname } = nextUrl
      const isAuthPage = pathname === '/login' || pathname === '/signup'

      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL('/', nextUrl))
      }
      if (!isLoggedIn && !isAuthPage) {
        return false // redirects to pages.signIn (/login)
      }
      return true
    },
    jwt({ token, user }) {
      if (user?.id) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
  providers: [], // providers added in auth.ts (Node.js only)
}
