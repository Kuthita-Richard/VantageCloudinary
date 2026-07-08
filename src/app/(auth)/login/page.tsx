/**
 * login/page.tsx
 *
 * DEPLOYMENT FIX:
 * useSearchParams() cannot be called directly in a page during prerendering.
 * It must live inside a component wrapped in <Suspense>.
 *
 * Pattern used:
 *   page.tsx          → Server-safe shell, renders <Suspense> wrapper
 *   LoginForm.tsx     → Client component that uses useSearchParams()
 *
 * This lets Next.js statically prerender the outer shell while deferring
 * the dynamic search-param read to the client hydration phase.
 */
import { Suspense }  from 'react'
import LoginForm     from './LoginForm'
import { BarChart2 } from 'lucide-react'
import Link          from 'next/link'

/** Shown while the login form is loading / hydrating */
function LoginSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-pulse space-y-4">
        <div className="h-8 rounded-xl" style={{ background: 'var(--muted)' }} />
        <div className="h-4 rounded-lg w-48" style={{ background: 'var(--muted)' }} />
        <div className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="h-11 rounded-xl" style={{ background: 'var(--muted)' }} />
          <div className="h-4 rounded w-32 mx-auto" style={{ background: 'var(--muted)' }} />
          <div className="h-10 rounded-xl" style={{ background: 'var(--muted)' }} />
          <div className="h-10 rounded-xl" style={{ background: 'var(--muted)' }} />
          <div className="h-11 rounded-xl" style={{ background: 'var(--muted)' }} />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0f7ff' }}>

      {/* ── Top nav bar — visible on all screen sizes ───────── */}
      <nav className="border-b px-6 py-3 flex items-center justify-between flex-shrink-0"
        style={{ background: '#ffffff', borderColor: '#bfdbfe' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: '#0c3460' }}>
            <BarChart2 size={14} color="#7dd3fc" />
          </div>
          <span className="font-bold text-sm" style={{ color: '#0c1a2e' }}>Vantage</span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link href="/manual"
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-70"
            style={{ color: '#4b6a8f' }}>
            User Manual
          </Link>
          <span style={{ color: '#bfdbfe' }}>·</span>
          <a href="mailto:support@vantage.app"
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-70"
            style={{ color: '#4b6a8f' }}>
            Support
          </a>
          <Link href="/login"
            className="ml-2 px-4 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: '#0284c7', color: 'white' }}>
            Sign In
          </Link>
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex flex-1">

      {/* Left branding panel */}

      {/* Left panel — branding (static, always rendered) */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12"
        style={{ background: '#0c3460' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(125,211,252,0.2)', border: '1px solid rgba(125,211,252,0.3)' }}>
            <BarChart2 size={22} color="#7dd3fc" />
          </div>
          <span className="text-white font-bold text-lg">Vantage</span>
        </div>

        <div>
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            Performance intelligence,<br />crystal clear.
          </h1>
          <p className="mt-4 text-base" style={{ color: '#93c5fd' }}>
            Real-time dashboards, drill-through charts, and branded PDF reports.
            All your data in one place — backed by Google Sheets.
          </p>
          <div className="flex gap-3 mt-8 flex-wrap">
            {[
              { label: 'Live dashboard',  color: '#7dd3fc' },
              { label: 'PDF reports',     color: '#86efac' },
              { label: 'Drill-through',   color: '#fde68a' },
              { label: 'Google Sheets',   color: '#f9a8d4' },
              { label: '40 currencies',   color: '#c4b5fd' },
            ].map(p => (
              <span key={p.label} className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: 'rgba(255,255,255,0.08)', color: p.color }}>
                {p.label}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: 'rgba(147,197,253,0.45)' }}>
          © {new Date().getFullYear()} Vantage · Performance Intelligence
        </p>
      </div>

      {/* Right panel — form (dynamic: needs Suspense for useSearchParams) */}
      <Suspense fallback={<LoginSkeleton />}>
        <LoginForm />
      </Suspense>

      </div>{/* end flex-1 */}

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs"
        style={{ borderColor: '#bfdbfe', color: '#4b6a8f', background: '#ffffff' }}>
        <span>© {new Date().getFullYear()} Vantage · Performance Intelligence</span>
        <div className="flex items-center gap-4">
          <Link href="/manual" className="hover:underline">User Manual</Link>
          <a href="mailto:support@vantage.app" className="hover:underline">Support</a>
        </div>
      </footer>

    </div>
  )
}
