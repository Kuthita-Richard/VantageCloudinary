'use client'

/**
 * DashboardShell.tsx — Client wrapper for the dashboard layout
 *
 * WHY THIS EXISTS:
 * The (dashboard)/layout.tsx is a Server Component (fetches settings, session).
 * Mobile sidebar state (open/closed) must live in a Client Component.
 * This shell bridges the two: it owns the state and passes it down as props
 * to Sidebar and Topbar, keeping those components in the same render tree.
 *
 * MOBILE BEHAVIOUR:
 * - Below lg (1024px): sidebar is a fixed overlay drawer (z-50) with a backdrop
 * - lg and above: sidebar is a static flex column in the layout
 *
 * The sidebar closes automatically on:
 * - Route navigation (handled inside Sidebar via usePathname)
 * - Backdrop click
 * - Escape key
 */

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar  from '@/components/layout/Topbar'
import type { OrgSettings } from '@/types'

interface Props {
  settings:  OrgSettings
  title:     string
  subtitle?: string
  children:  React.ReactNode
}

export default function DashboardShell({ settings, title, subtitle, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen(o => !o), [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Mobile backdrop ───────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────── */}
      {/*
        Desktop (lg+): static flex column, always visible, part of layout flow
        Mobile (<lg):  fixed overlay, slides in from left with CSS transform
      */}
      <div
        className={[
          // Shared
          'flex-shrink-0 z-50',
          // Desktop: static, always visible, 224px wide
          'lg:static lg:translate-x-0 lg:w-56',
          // Mobile: fixed overlay, full height, wider for thumb comfort
          'fixed inset-y-0 left-0 w-72',
          // Slide transition
          'transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <Sidebar
          settings={settings}
          onNavigate={closeSidebar}
        />
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar
          title={title}
          subtitle={subtitle}
          onMenuClick={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

    </div>
  )
}
