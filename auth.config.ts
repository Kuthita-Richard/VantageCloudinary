/**
 * auth.config.ts — Edge-safe Auth.js configuration
 *
 * This file MUST NOT import any Node.js-only packages (googleapis, fs, crypto, etc.)
 * because it runs in the Edge Runtime (middleware / proxy.ts).
 *
 * The full auth.ts extends this config and adds the Google Sheets role lookup,
 * which can only run in the Node.js runtime (Server Components, Server Actions).
 */
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),

    Credentials({
      name: 'Shared Access',
      credentials: {
        name:     { label: 'Your Name',       type: 'text'     },
        password: { label: 'Access Password', type: 'password' },
      },
      // authorize() intentionally left undefined here.
      // The full auth.ts handles credential validation.
      // Edge config only needs the provider shape for middleware.
      authorize: () => null,
    }),
  ],

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  callbacks: {
    /**
     * authorized() — runs in Edge Runtime (middleware).
     * Keep this lightweight: only read the token, never call external APIs.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn   = !!auth?.user
      const isPublicPath = ['/login', '/api/auth', '/manual'].some(p =>
        nextUrl.pathname.startsWith(p)
      )

      if (isPublicPath) {
        // Redirect logged-in users away from the login page
        if (isLoggedIn && nextUrl.pathname === '/login') {
          return Response.redirect(new URL('/', nextUrl))
        }
        return true
      }

      // All other routes require authentication
      if (!isLoggedIn) {
        const loginUrl = new URL('/login', nextUrl)
        loginUrl.searchParams.set('callbackUrl', nextUrl.pathname)
        return Response.redirect(loginUrl)
      }

      // Role-based path guards (token.role set by full auth.ts JWT callback)
      const role = (auth as { user?: { role?: string } }).user?.role

      if (nextUrl.pathname.startsWith('/settings') && role !== 'Admin') {
        return Response.redirect(new URL('/', nextUrl))
      }

      if (
        (nextUrl.pathname.startsWith('/entry') ||
         nextUrl.pathname.startsWith('/upload')) &&
        role === 'Viewer'
      ) {
        return Response.redirect(new URL('/', nextUrl))
      }

      return true
    },
  },

  session: { strategy: 'jwt' },
}
