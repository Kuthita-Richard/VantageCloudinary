// ── User & Auth ─────────────────────────────────────────────
export type UserRole = 'Admin' | 'DataEntry' | 'Viewer'

export interface AppUser {
  id: string
  name: string
  email: string
  image?: string
  role: UserRole
  provider: 'google' | 'credentials'
}

export interface AuthorizedUser {
  email: string
  role: UserRole
  addedAt: string
  addedBy: string
}

// ── Performance ──────────────────────────────────────────────
export type PerformanceFlag = 'Exceeding' | 'On Track' | 'At Risk' | 'Below Target'

export interface PerformanceThresholds {
  exceeding: number  // ≥ this → Exceeding  (default 100)
  onTrack: number    // ≥ this → On Track   (default 90)
  atRisk: number     // ≥ this → At Risk    (default 75)
  // < atRisk → Below Target
}

// ── Sales Data ───────────────────────────────────────────────
export interface SalesRecord {
  id: string
  date: string           // ISO string: 2024-01-15
  year: number
  month: string          // January, February, etc.
  region: string
  category: string       // dynamic label (Product/Service/etc.)
  salesRep: string
  targetAmount: number
  actualAmount: number
  status: 'Active' | 'Inactive'
  notes?: string
  // computed
  variance: number       // actualAmount - targetAmount
  achievementPct: number // (actualAmount / targetAmount) * 100
  performanceFlag: PerformanceFlag
  // audit
  recordedBy: string
  recordedByEmail: string
  recordedAt: string
}

export interface SalesRecordInput {
  date: string
  region: string
  category: string
  salesRep: string
  targetAmount: number
  actualAmount: number
  status: 'Active' | 'Inactive'
  notes?: string
}

// ── Targets ──────────────────────────────────────────────────
export interface Target {
  year: number
  month: string
  region: string
  category: string
  salesRep: string
  targetAmount: number
}

// ── Metadata / Reference Lists ───────────────────────────────
export interface OrgMetadata {
  regions: string[]
  categories: string[]
  salesReps: string[]
  statuses: string[]
}

// ── Organisation Settings ────────────────────────────────────
export interface OrgSettings {
  // Identity
  orgName: string
  orgLegalName: string
  tagline: string
  logoUrlLight: string
  logoUrlDark: string
  faviconUrl: string
  websiteUrl: string

  // Contact
  primaryEmail: string
  supportEmail: string
  phoneNumber: string
  address: string
  postalCode: string
  linkedinUrl: string
  otherSocialUrl: string

  // Branding
  primaryColor: string
  secondaryColor: string
  sidebarColor: string
  accentColor: string
  defaultMode: 'light' | 'dark' | 'system'
  fontFamily: string

  // Report / PDF
  reportTitlePrefix: string
  preparedByDefault: string
  footerText: string
  currencySymbol: string
  currencyCode:   string   // ISO 4217 e.g. "KES" — used for exchange rate lookups
  currencyFormat: 'comma-dot' | 'dot-comma'
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  fiscalYearStart: string
  includeWatermark: boolean
  watermarkText: string
  showRecordedBy: boolean

  // App Config
  categoryLabel: string
  regionLabel: string
  salesRepLabel: string
  perfThresholdExceeding: number
  perfThresholdOnTrack: number
  perfThresholdAtRisk: number
  defaultDashboardPeriod: 'month' | 'quarter' | 'year'
  allowDataEdit: boolean
  requireEntryNotes: boolean
}

// ── Dashboard Aggregates ─────────────────────────────────────
export interface DashboardKPIs {
  targetAmount: number
  actualAmount: number
  targetsMet: number
  totalRecords: number
  variance: number
  achievementPct: number
  performanceFlag: PerformanceFlag
}

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

export interface RegionChartData {
  region: string
  actual: number
  target: number
  variancePct: number
  targetMetPct: number
}

export interface CategoryChartData {
  category: string
  actual: number
  target: number
  variancePct: number
}

// ── Filters ──────────────────────────────────────────────────
export interface DashboardFilters {
  year: string
  month: string
  region: string
  category: string
  salesRep: string
  status: string
  performanceFlag: string
}

// ── Upload ───────────────────────────────────────────────────
export interface UploadResult {
  success: number
  failed: number
  errors: string[]
  preview: Partial<SalesRecord>[]
}
