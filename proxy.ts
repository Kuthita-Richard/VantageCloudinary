/**
 * proxy.ts — Next.js 16 Middleware (renamed from middleware.ts in Next.js 16)
 *
 * Uses the EDGE-SAFE authConfig (auth.config.ts), NOT the full auth.ts.
 * The full auth.ts imports googleapis which is Node.js-only and will crash
 * the Edge Runtime if imported here.
 *
 * What this file does:
 *  - Protects all routes except /login and /api/auth
 *  - Redirects unauthenticated users to /login
 *  - Enforces role-based access (Admin, DataEntry, Viewer)
 *  - Redirects already-logged-in users away from /login
 */
import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

const { auth } = NextAuth(authConfig)

export default auth

export const config = {
  /*
   * Match all routes EXCEPT:
   *  - _next/static  (static files)
   *  - _next/image   (Next.js image optimisation)
   *  - favicon.ico
   *  - common image extensions
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)',
  ],
}
