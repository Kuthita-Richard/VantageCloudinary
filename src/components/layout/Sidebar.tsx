'use client'

/**
 * Sidebar.tsx — Main navigation panel
 *
 * Accepts an `onNavigate` callback that DashboardShell uses to close
 * the mobile drawer when the user taps a link. On desktop this is a no-op.
 *
 * Also detects pathname changes internally (usePathname effect) to close
 * the drawer when Next.js router navigation completes — covers programmatic
 * navigation (router.push) that doesn't go through the Link onClick handler.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import {
  LayoutDashboard, TrendingUp, FilePlus, Upload,
  FileText, Settings, ChevronRight, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrgSettings } from '@/types'
import Image from 'next/image'

interface NavChild { label: string; href: string }
interface NavItem {
  label:    string
  href:     string
  icon:     React.ElementType
  roles?:   string[]
  children?: NavChild[]
}

function buildNav(s: OrgSettings): NavItem[] {
  return [
    { label: 'Overview',      href: '/',                  icon: LayoutDashboard },
    {
      label: 'Analysis',      href: '/analysis/region',   icon: TrendingUp,
      children: [
        { label: s.regionLabel,    href: '/analysis/region'   },
        { label: s.categoryLabel,  href: '/analysis/category' },
        { label: s.salesRepLabel,  href: '/analysis/salesrep' },
        { label: 'Monthly Trends', href: '/analysis/trends'   },
      ],
    },
    { label: 'Data Entry',    href: '/entry',             icon: FilePlus,  roles: ['Admin','DataEntry'] },
    { label: 'Import Excel',  href: '/upload',            icon: Upload,    roles: ['Admin','DataEntry'] },
    { label: 'Reports & PDF', href: '/reports',           icon: FileText  },
    { label: 'Settings',      href: '/settings/identity', icon: Settings,  roles: ['Admin'] },
  ]
}

interface Props {
  settings:    OrgSettings
  onNavigate?: () => void   // called after any nav link tap (closes mobile drawer)
}

export default function Sidebar({ settings, onNavigate }: Props) {
  const pathname            = usePathname()
  const { data: session }   = useSession()
  const role                = session?.user?.role ?? 'Viewer'
  const nav                 = buildNav(settings)

  // Close mobile drawer whenever the pathname changes
  useEffect(() => {
    onNavigate?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const isActive  = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const canSee    = (item: NavItem) => !item.roles || item.roles.includes(role)

  const activeColor = '#7dd3fc'   // sky-300
  const mutedColor  = '#93c5fd'   // blue-300

  return (
    <aside
      className="flex flex-col h-full w-full"
      style={{
        background:   'var(--sidebar)',
        borderRight:  '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Brand */}
      <div className="p-5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/" className="flex items-center gap-3">
          {settings.logoUrlLight ? (
            <Image src={settings.logoUrlLight} alt={settings.orgName}
              width={34} height={34} className="rounded-lg object-contain flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(125,211,252,0.15)',
                border: '1px solid rgba(125,211,252,0.3)',
              }}>
              <BarChart2 size={18} color={activeColor} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold truncate text-white leading-tight">
              {settings.orgName}
            </p>
            {settings.tagline && (
              <p className="text-[10px] truncate leading-tight mt-0.5"
                style={{ color: mutedColor, opacity: 0.65 }}>
                {settings.tagline}
              </p>
            )}
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {nav.filter(canSee).map(item => {
          const active  = isActive(item.href)
          const Icon    = item.icon
          const hasKids = !!item.children

          if (hasKids) {
            const anyActive = item.children!.some(c => isActive(c.href))
            return (
              <div key={item.href}>
                <div
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm select-none"
                  style={{
                    color:   anyActive ? activeColor : mutedColor,
                    opacity: anyActive ? 1 : 0.75,
                  }}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  <span className="flex-1 font-medium">{item.label}</span>
                  <ChevronRight size={12}
                    className={cn('transition-transform flex-shrink-0', anyActive && 'rotate-90')} />
                </div>
                <div className="ml-5 mt-0.5 space-y-0.5 pl-3"
                  style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                  {item.children!.map(child => {
                    const ca = isActive(child.href)
                    return (
                      <Link key={child.href} href={child.href}
                        className="flex items-center px-2 py-1.5 rounded-md text-xs transition-all"
                        style={{
                          color:      ca ? activeColor : mutedColor,
                          fontWeight: ca ? '600' : '400',
                          background: ca ? 'rgba(125,211,252,0.1)' : 'transparent',
                          opacity:    ca ? 1 : 0.75,
                        }}>
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          }

          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                color:       active ? activeColor : mutedColor,
                background:  active ? 'rgba(125,211,252,0.1)' : 'transparent',
                borderLeft:  active ? `2px solid ${activeColor}` : '2px solid transparent',
                opacity:     active ? 1 : 0.8,
              }}>
              <Icon size={15} className="flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Manual link */}
      <div className="px-4 pb-2 flex-shrink-0">
        <a href="/manual" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:opacity-80"
          style={{ color: 'rgba(147,197,253,0.65)' }}>
          <span>📖</span> User Manual
        </a>
      </div>

      {/* User strip */}
      {session?.user && (
        <div className="p-3 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            {session.user.image ? (
              <Image src={session.user.image} alt={session.user.name ?? ''}
                width={28} height={28} className="rounded-full flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center
                text-xs font-bold flex-shrink-0 text-white"
                style={{ background: 'rgba(125,211,252,0.2)' }}>
                {session.user.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-white leading-tight">
                {session.user.name}
              </p>
              <p className="text-[10px] leading-tight mt-0.5"
                style={{ color: mutedColor, opacity: 0.65 }}>
                {session.user.role}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
