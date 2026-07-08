/**
 * lib/utils.ts — Shared utility functions
 *
 * Pure functions with no side effects. Safe to import anywhere
 * (Edge Runtime, Node.js, Client Components) because they have
 * zero external dependencies beyond the project's own types.
 *
 * Key exports:
 *  - cn()                     Tailwind class merger (clsx + tailwind-merge)
 *  - formatCurrency()         Full currency string with symbol
 *  - formatCurrencyCompact()  Abbreviated: $1.2M, $450K
 *  - formatPct()              "99.8%"
 *  - computePerformanceFlag() Core business logic — Exceeding/On Track/At Risk/Below Target
 *  - PERFORMANCE_STYLES       Tailwind classes + emoji per flag
 *  - generateId()             Collision-resistant record ID
 *  - DEFAULT_SETTINGS         Fallback org settings (no DB/sheet required)
 */
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PerformanceFlag, PerformanceThresholds, OrgSettings } from '@/types'

// ── Class name merger ──────────────────────────────────────────
/**
 * Merges Tailwind CSS classes safely, resolving conflicts.
 * Uses clsx for conditional logic + tailwind-merge for deduplication.
 *
 * @example cn('px-2 py-1', isActive && 'bg-blue-500', 'px-4')
 *          → 'py-1 bg-blue-500 px-4'  (px-2 removed, px-4 wins)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Currency formatters ────────────────────────────────────────
/**
 * Formats a number as a full currency string.
 * Negative values are shown with a leading minus: -$1,234.56
 *
 * @param value   The numeric amount
 * @param symbol  Currency symbol (from OrgSettings.currencySymbol)
 * @param format  'comma-dot' → 1,000.00 | 'dot-comma' → 1.000,00
 */
export function formatCurrency(
  value: number,
  symbol: string = '$',
  format: 'comma-dot' | 'dot-comma' = 'comma-dot'
): string {
  const abs = Math.abs(value)
  const formatted =
    format === 'comma-dot'
      ? abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : abs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return `${value < 0 ? '-' : ''}${symbol}${formatted}`
}

/**
 * Compact currency formatter for chart labels and KPI cards where space is limited.
 * Rounds to one decimal place at each magnitude threshold.
 *
 * @example formatCurrencyCompact(1_250_000, 'KSh') → 'KSh1.3M'
 * @example formatCurrencyCompact(-61820, '$')       → '-$61.8K'
 */
export function formatCurrencyCompact(value: number, symbol: string = '$'): string {
  const abs  = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`
  return `${sign}${symbol}${abs.toFixed(0)}`
}

/**
 * Formats a number as a percentage string.
 * @example formatPct(99.8)    → '99.8%'
 * @example formatPct(100, 0)  → '100%'
 */
export function formatPct(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

// ── Date formatter ─────────────────────────────────────────────
/**
 * Formats an ISO date string according to the org's preferred date format.
 * Falls back to DD/MM/YYYY if format is unrecognised.
 */
export function formatDate(
  isoDate: string,
  format: OrgSettings['dateFormat'] = 'DD/MM/YYYY'
): string {
  const d     = new Date(isoDate)
  const day   = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year  = d.getFullYear()

  switch (format) {
    case 'DD/MM/YYYY': return `${day}/${month}/${year}`
    case 'MM/DD/YYYY': return `${month}/${day}/${year}`
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`
    default:           return `${day}/${month}/${year}`
  }
}

/** All 12 calendar months in order. Used for filter dropdowns and date parsing. */
export const MONTHS = [
  'January', 'February', 'March',     'April',
  'May',     'June',     'July',      'August',
  'September','October', 'November',  'December',
]

// ── Performance flag ───────────────────────────────────────────
/**
 * Core business logic: determines how a sales record is classified.
 *
 * Called at write time (createSalesRecord, bulkCreateSalesRecords) and
 * at aggregate time (DashboardPage, RegionPage, etc.).
 *
 * The result is stored in the PerformanceFlag column of SalesData so
 * the dashboard never recomputes it on read — keeping query time O(1).
 *
 * @param actualAmount   What was actually sold/achieved
 * @param targetAmount   What was targeted
 * @param thresholds     Configurable per org via Settings → App Config
 *
 * @returns flag            The classification string
 * @returns achievementPct  (actual / target) × 100, clamped to 0 if target is 0
 * @returns variance        actual − target (can be negative)
 */
export function computePerformanceFlag(
  actualAmount: number,
  targetAmount: number,
  thresholds: PerformanceThresholds = { exceeding: 100, onTrack: 90, atRisk: 75 }
): { flag: PerformanceFlag; achievementPct: number; variance: number } {
  const variance       = actualAmount - targetAmount
  const achievementPct = targetAmount === 0 ? 0 : (actualAmount / targetAmount) * 100

  let flag: PerformanceFlag
  if      (achievementPct >= thresholds.exceeding) flag = 'Exceeding'
  else if (achievementPct >= thresholds.onTrack)   flag = 'On Track'
  else if (achievementPct >= thresholds.atRisk)    flag = 'At Risk'
  else                                              flag = 'Below Target'

  return { flag, achievementPct, variance }
}

/**
 * Maps each PerformanceFlag to its Tailwind CSS classes and display emoji.
 * Used consistently across KPI cards, table cells, badges, and PDF reports.
 *
 * Colors use Tailwind opacity modifiers so they adapt to both light and dark mode.
 */
export const PERFORMANCE_STYLES: Record<
  PerformanceFlag,
  { color: string; bg: string; border: string; emoji: string }
> = {
  'Exceeding':    { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', emoji: '🟢' },
  'On Track':     { color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/30',    emoji: '🔵' },
  'At Risk':      { color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/30',   emoji: '🟡' },
  'Below Target': { color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/30',     emoji: '🔴' },
}

// ── ID generator ───────────────────────────────────────────────
/**
 * Generates a human-readable, collision-resistant record ID.
 * Format: VTG-YYYYMMDD-XXXX where XXXX is 4 random alphanumeric chars.
 *
 * Not cryptographically secure — for display/reference purposes only.
 * Not guaranteed unique at extreme volume (> ~10,000 records/day).
 *
 * @example generateId('VTG-') → 'VTG-20240115-X7K2'
 */
export function generateId(prefix: string = ''): string {
  const date     = new Date()
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '')
  const rand     = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}${datePart}-${rand}`
}

// ── Misc helpers ───────────────────────────────────────────────
/**
 * Safely parses any value to a number. Returns 0 instead of NaN.
 * Used when reading Google Sheets cells which are always strings.
 */
export function safeParseNumber(value: unknown): number {
  const n = Number(value)
  return isNaN(n) ? 0 : n
}

/**
 * Debounces a function call. Used for search inputs and filter changes
 * that would otherwise fire on every keystroke.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ── Default settings ───────────────────────────────────────────
/**
 * Fallback organisation settings used when:
 *  a) The Settings tab does not exist yet (first run)
 *  b) A key is missing from the Settings tab
 *  c) Google Sheets is unreachable (network error)
 *
 * Ensures the app renders correctly even with no configuration.
 */
export const DEFAULT_SETTINGS: OrgSettings = {
  orgName:                'Vantage',
  orgLegalName:           '',
  tagline:                'Performance Intelligence',
  logoUrlLight:           '',
  logoUrlDark:            '',
  faviconUrl:             '',
  websiteUrl:             '',
  primaryEmail:           '',
  supportEmail:           '',
  phoneNumber:            '',
  address:                '',
  postalCode:             '',
  linkedinUrl:            '',
  otherSocialUrl:         '',
  primaryColor:           '#0284c7',
  secondaryColor:         '#7dd3fc',
  sidebarColor:           '#0c3460',
  accentColor:            '#16a34a',
  defaultMode:            'light',
  fontFamily:             'Inter',
  reportTitlePrefix:      'Performance Report —',
  preparedByDefault:      '',
  footerText:             'Confidential. For internal use only.',
  currencySymbol:         '$',
  currencyCode:           'USD',
  currencyFormat:         'comma-dot',
  dateFormat:             'DD/MM/YYYY',
  fiscalYearStart:        'January',
  includeWatermark:       false,
  watermarkText:          'CONFIDENTIAL',
  showRecordedBy:         true,
  categoryLabel:          'Product',
  regionLabel:            'Region',
  salesRepLabel:          'Sales Rep',
  perfThresholdExceeding: 100,
  perfThresholdOnTrack:   90,
  perfThresholdAtRisk:    75,
  defaultDashboardPeriod: 'month',
  allowDataEdit:          false,
  requireEntryNotes:      false,
}
