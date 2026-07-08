import { z } from 'zod'

// ── Sales Entry ───────────────────────────────────────────────
export const salesEntrySchema = z.object({
  date: z
    .string()
    .min(1, 'Date is required')
    .refine(d => !isNaN(Date.parse(d)), 'Invalid date'),
  region:       z.string().min(1, 'Region is required'),
  category:     z.string().min(1, 'Category is required'),
  salesRep:     z.string().min(1, 'Sales rep is required'),
  targetAmount: z
    .number({ error: 'Must be a number' })
    .positive('Target must be greater than 0'),
  actualAmount: z
    .number({ error: 'Must be a number' })
    .min(0, 'Actual amount cannot be negative'),
  status:  z.enum(['Active', 'Inactive']),
  notes:   z.string().max(500, 'Notes max 500 characters').optional(),
})

export type SalesEntryInput = z.infer<typeof salesEntrySchema>

// ── Settings — Identity ───────────────────────────────────────
export const identitySettingsSchema = z.object({
  orgName:      z.string().min(1, 'Organization name is required').max(100),
  orgLegalName: z.string().max(150).optional(),
  tagline:      z.string().max(200).optional(),
  websiteUrl:   z.string().url('Must be a valid URL').optional().or(z.literal('')),
  logoUrlLight: z.string().optional(),
  logoUrlDark:  z.string().optional(),
  faviconUrl:   z.string().optional(),
})

// ── Settings — Contact ────────────────────────────────────────
export const contactSettingsSchema = z.object({
  primaryEmail:   z.string().email('Invalid email').optional().or(z.literal('')),
  supportEmail:   z.string().email('Invalid email').optional().or(z.literal('')),
  phoneNumber:    z.string().max(30).optional(),
  address:        z.string().max(300).optional(),
  postalCode:     z.string().max(20).optional(),
  linkedinUrl:    z.string().url().optional().or(z.literal('')),
  otherSocialUrl: z.string().url().optional().or(z.literal('')),
})

// ── Settings — Branding ───────────────────────────────────────
export const brandingSettingsSchema = z.object({
  primaryColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color'),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color'),
  sidebarColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color'),
  accentColor:    z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color'),
  defaultMode:    z.enum(['light', 'dark', 'system']),
  fontFamily:     z.enum(['Inter', 'Poppins', 'DM Sans', 'Plus Jakarta Sans', 'Geist']),
})

// ── Settings — Report ─────────────────────────────────────────
export const reportSettingsSchema = z.object({
  reportTitlePrefix: z.string().max(100).optional(),
  preparedByDefault: z.string().max(100).optional(),
  footerText:        z.string().max(300).optional(),
  currencySymbol:    z.string().max(5),
  currencyCode:      z.string().length(3, 'Must be a 3-letter ISO code'),
  currencyFormat:    z.enum(['comma-dot', 'dot-comma']),
  dateFormat:        z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  fiscalYearStart:   z.string(),
  includeWatermark:  z.boolean(),
  watermarkText:     z.string().max(50).optional(),
  showRecordedBy:    z.boolean(),
})

// ── Settings — App Config ─────────────────────────────────────
export const appConfigSchema = z.object({
  categoryLabel:          z.string().min(1).max(50),
  regionLabel:            z.string().min(1).max(50),
  salesRepLabel:          z.string().min(1).max(50),
  perfThresholdExceeding: z.number().min(0).max(200),
  perfThresholdOnTrack:   z.number().min(0).max(200),
  perfThresholdAtRisk:    z.number().min(0).max(200),
  defaultDashboardPeriod: z.enum(['month', 'quarter', 'year']),
  allowDataEdit:          z.boolean(),
  requireEntryNotes:      z.boolean(),
})

// ── Authorized User ───────────────────────────────────────────
export const authorizedUserSchema = z.object({
  email: z.string().email('Valid email required'),
  role:  z.enum(['Admin', 'DataEntry', 'Viewer']),
})

// ── Excel upload column mapping ───────────────────────────────
export const excelRowSchema = z.object({
  date:         z.string().min(1, 'Date required'),
  region:       z.string().min(1, 'Region required'),
  category:     z.string().min(1, 'Category required'),
  salesRep:     z.string().min(1, 'Sales rep required'),
  targetAmount: z.number().positive('Target must be > 0'),
  actualAmount: z.number().min(0),
  status:       z.enum(['Active', 'Inactive']).default('Active'),
  notes:        z.string().optional(),
})

export type ExcelRowInput = z.infer<typeof excelRowSchema>
