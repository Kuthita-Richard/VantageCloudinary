/**
 * (dashboard)/layout.tsx — Protected dashboard shell
 *
 * Kept as a Server Component so it can:
 * - Verify the session (trust middleware, but read role for Topbar subtitle)
 * - Fetch org settings for the Sidebar brand + theme values
 *
 * Mobile sidebar state (open/closed) lives in DashboardShell (client component).
 * This pattern avoids "use client" on the layout itself, preserving
 * Server Component data-fetching for the settings/session reads.
 */
import { auth }         from '@/lib/auth'
import { getOrgSettings } from '@/lib/sheets'
import DashboardShell   from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, settings] = await Promise.all([auth(), getOrgSettings()])

  return (
    <DashboardShell
      settings={settings}
      title={settings.orgName}
      subtitle={`${settings.tagline}${session?.user?.role ? ` · ${session.user.role}` : ''}`}
    >
      {children}
    </DashboardShell>
  )
}
