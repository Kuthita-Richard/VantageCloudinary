import type { Metadata } from 'next'
import { Inter, Poppins, DM_Sans, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { getOrgSettings } from '@/lib/sheets'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'

const inter       = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const poppins     = Poppins({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-poppins', display: 'swap' })
const dmSans      = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta', display: 'swap' })

const FONT_VAR: Record<string, string> = {
  'Inter':             'var(--font-inter)',
  'Poppins':           'var(--font-poppins)',
  'DM Sans':           'var(--font-dm-sans)',
  'Plus Jakarta Sans': 'var(--font-plus-jakarta)',
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getOrgSettings()
  return {
    title: { default: settings.orgName, template: `%s | ${settings.orgName}` },
    description: settings.tagline,
    icons: settings.faviconUrl ? { icon: settings.faviconUrl } : undefined,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getOrgSettings()
  const fontVar = FONT_VAR[settings.fontFamily] ?? FONT_VAR['Inter']

  const themeStyle = {
    '--primary':    settings.primaryColor,
    '--sidebar':    settings.sidebarColor,
    '--accent-clr': settings.accentColor,
    fontFamily:     fontVar,
  } as React.CSSProperties

  return (
    <html lang="en" className={settings.defaultMode === 'light' ? 'light' : ''} style={themeStyle}>
      <body className={`${inter.variable} ${poppins.variable} ${dmSans.variable} ${plusJakarta.variable} antialiased`}>
        <SessionProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--card)',
                color: 'var(--fg)',
                border: '1px solid var(--border)',
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}
