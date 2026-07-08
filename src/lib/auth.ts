/**
 * lib/auth.ts — Full Auth.js v5 configuration (Node.js runtime only)
 *
 * This file CAN import Node.js-only packages (googleapis for role lookup).
 * It extends auth.config.ts and adds:
 *  - Real credential validation (shared password check)
 *  - Google Sheets role lookup in JWT callback
 *  - Session shape augmentation
 *
 * NEVER import this file from proxy.ts / middleware — use auth.config.ts there.
 */
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from '../../auth.config'
import { getUserRole } from '@/lib/sheets'
import type { UserRole } from '@/types'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

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
      async authorize(credentials) {
        const sharedPassword = process.env.SHARED_ACCESS_PASSWORD
        if (!sharedPassword)                                    return null
        if (credentials.password !== sharedPassword)           return null
        if (!credentials.name || String(credentials.name).trim().length < 2) return null

        const name           = String(credentials.name).trim()
        const syntheticEmail = `${name.toLowerCase().replace(/\s+/g, '.')}.shared@internal`

        return { id: syntheticEmail, name, email: syntheticEmail, image: null }
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email       = user.email!
        const adminEmails = (process.env.ADMIN_EMAILS ?? '')
          .split(',').map(e => e.trim()).filter(Boolean)

        if (adminEmails.includes(email)) return true

        try {
          const role = await getUserRole(email)
          return role !== null
        } catch {
          return false
        }
      }
      return true  // credentials users already validated in authorize()
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.provider = account?.provider ?? 'credentials'

        const adminEmails = (process.env.ADMIN_EMAILS ?? '')
          .split(',').map(e => e.trim()).filter(Boolean)

        if (adminEmails.includes(user.email ?? '')) {
          token.role = 'Admin' as UserRole
        } else if (account?.provider === 'credentials') {
          token.role = 'DataEntry' as UserRole
        } else {
          try {
            token.role = (await getUserRole(user.email!)) ?? ('Viewer' as UserRole)
          } catch {
            token.role = 'Viewer' as UserRole
          }
        }
      }
      return token
    },

    async session({ session, token }) {
      session.user.role     = token.role     as UserRole
      session.user.provider = token.provider as string
      return session
    },
  },

  pages:   { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt' },
})
