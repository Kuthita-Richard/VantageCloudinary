import { google } from 'googleapis'
import { unstable_cache } from 'next/cache'
import type {
  SalesRecord,
  SalesRecordInput,
  OrgSettings,
  OrgMetadata,
  AuthorizedUser,
  Target,
} from '@/types'
import {
  computePerformanceFlag,
  generateId,
  safeParseNumber,
  DEFAULT_SETTINGS,
  MONTHS,
} from '@/lib/utils'

// ── Auth client ───────────────────────────────────────────────
function getGoogleAuth() {
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL

  if (!privateKey || !clientEmail) {
    throw new Error('Google Sheets credentials not configured in environment variables.')
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getGoogleAuth() })
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!

// ── Sheet names ───────────────────────────────────────────────
const SHEETS = {
  SALES: 'SalesData',
  TARGETS: 'Targets',
  METADATA: 'Metadata',
  SETTINGS: 'Settings',
  AUDIT: 'AuditLog',
  USERS: 'AuthorizedUsers',
} as const

// ── Helper: get sheet values ──────────────────────────────────
async function getSheetValues(range: string): Promise<string[][]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  })
  return (res.data.values as string[][]) ?? []
}

// ── Helper: append rows ───────────────────────────────────────
async function appendRows(sheetName: string, rows: unknown[][]) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  })
}

// ── Helper: update a row by row index ─────────────────────────
async function updateRow(sheetName: string, rowIndex: number, values: unknown[]) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })
}

// ─────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────

/**
 * Cached org settings — 1 hour TTL.
 * Invalidated on every settings save via revalidateTag('org-settings') in actions.
 */
export const getOrgSettings = unstable_cache(
  async (): Promise<OrgSettings> => _getOrgSettings(),
  ['org-settings'],
  { tags: ['org-settings'], revalidate: 3600 }
)

async function _getOrgSettings(): Promise<OrgSettings> {
  try {
    const rows = await getSheetValues(`${SHEETS.SETTINGS}!A:B`)
    const map: Record<string, string> = {}
    rows.forEach(([key, value]) => {
      if (key) map[key] = value ?? ''
    })

    return {
      orgName:                map.OrgName                || DEFAULT_SETTINGS.orgName,
      orgLegalName:           map.OrgLegalName           || DEFAULT_SETTINGS.orgLegalName,
      tagline:                map.Tagline                || DEFAULT_SETTINGS.tagline,
      logoUrlLight:           map.LogoUrlLight           || DEFAULT_SETTINGS.logoUrlLight,
      logoUrlDark:            map.LogoUrlDark            || DEFAULT_SETTINGS.logoUrlDark,
      faviconUrl:             map.FaviconUrl             || DEFAULT_SETTINGS.faviconUrl,
      websiteUrl:             map.WebsiteUrl             || DEFAULT_SETTINGS.websiteUrl,
      primaryEmail:           map.PrimaryEmail           || DEFAULT_SETTINGS.primaryEmail,
      supportEmail:           map.SupportEmail           || DEFAULT_SETTINGS.supportEmail,
      phoneNumber:            map.PhoneNumber            || DEFAULT_SETTINGS.phoneNumber,
      address:                map.Address                || DEFAULT_SETTINGS.address,
      postalCode:             map.PostalCode             || DEFAULT_SETTINGS.postalCode,
      linkedinUrl:            map.LinkedinUrl            || DEFAULT_SETTINGS.linkedinUrl,
      otherSocialUrl:         map.OtherSocialUrl         || DEFAULT_SETTINGS.otherSocialUrl,
      primaryColor:           map.PrimaryColor           || DEFAULT_SETTINGS.primaryColor,
      secondaryColor:         map.SecondaryColor         || DEFAULT_SETTINGS.secondaryColor,
      sidebarColor:           map.SidebarColor           || DEFAULT_SETTINGS.sidebarColor,
      accentColor:            map.AccentColor            || DEFAULT_SETTINGS.accentColor,
      defaultMode:            (map.DefaultMode as OrgSettings['defaultMode']) || DEFAULT_SETTINGS.defaultMode,
      fontFamily:             map.FontFamily             || DEFAULT_SETTINGS.fontFamily,
      reportTitlePrefix:      map.ReportTitlePrefix      || DEFAULT_SETTINGS.reportTitlePrefix,
      preparedByDefault:      map.PreparedByDefault      || DEFAULT_SETTINGS.preparedByDefault,
      footerText:             map.FooterText             || DEFAULT_SETTINGS.footerText,
      currencySymbol:         map.CurrencySymbol         || DEFAULT_SETTINGS.currencySymbol,
      currencyCode:           map.CurrencyCode            || DEFAULT_SETTINGS.currencyCode,
      currencyFormat:         (map.CurrencyFormat as OrgSettings['currencyFormat']) || DEFAULT_SETTINGS.currencyFormat,
      dateFormat:             (map.DateFormat as OrgSettings['dateFormat']) || DEFAULT_SETTINGS.dateFormat,
      fiscalYearStart:        map.FiscalYearStart        || DEFAULT_SETTINGS.fiscalYearStart,
      includeWatermark:       map.IncludeWatermark === 'true',
      watermarkText:          map.WatermarkText          || DEFAULT_SETTINGS.watermarkText,
      showRecordedBy:         map.ShowRecordedBy !== 'false',
      categoryLabel:          map.CategoryLabel          || DEFAULT_SETTINGS.categoryLabel,
      regionLabel:            map.RegionLabel            || DEFAULT_SETTINGS.regionLabel,
      salesRepLabel:          map.SalesRepLabel          || DEFAULT_SETTINGS.salesRepLabel,
      perfThresholdExceeding: safeParseNumber(map.PerfThresholdExceeding) || DEFAULT_SETTINGS.perfThresholdExceeding,
      perfThresholdOnTrack:   safeParseNumber(map.PerfThresholdOnTrack)   || DEFAULT_SETTINGS.perfThresholdOnTrack,
      perfThresholdAtRisk:    safeParseNumber(map.PerfThresholdAtRisk)    || DEFAULT_SETTINGS.perfThresholdAtRisk,
      defaultDashboardPeriod: (map.DefaultDashboardPeriod as OrgSettings['defaultDashboardPeriod']) || DEFAULT_SETTINGS.defaultDashboardPeriod,
      allowDataEdit:          map.AllowDataEdit === 'true',
      requireEntryNotes:      map.RequireEntryNotes === 'true',
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

// ─────────────────────────────────────────────────────────────
// CACHED PUBLIC READS
// ─────────────────────────────────────────────────────────────

/**
 * Cached metadata — 30 min TTL.
 * Invalidated when metadata is changed via revalidateTag('metadata').
 */
export const getMetadata = unstable_cache(
  async (): Promise<OrgMetadata> => _getMetadata(),
  ['metadata'],
  { tags: ['metadata'], revalidate: 1800 }
)

/**
 * Cached sales records — 5 min TTL.
 * Invalidated after every write via revalidateTag('sales-data').
 */
export const getSalesRecords = unstable_cache(
  async (settings?: Partial<OrgSettings>): Promise<SalesRecord[]> =>
    _getSalesRecords(settings),
  ['sales-data'],
  { tags: ['sales-data'], revalidate: 300 }
)

/**
 * Cached authorized users — 1 hour TTL.
 * Invalidated when user list changes via revalidateTag('auth-users').
 */
export const getAuthorizedUsers = unstable_cache(
  async (): Promise<AuthorizedUser[]> => _getAuthorizedUsers(),
  ['auth-users'],
  { tags: ['auth-users'], revalidate: 3600 }
)

export async function updateOrgSettings(updates: Partial<OrgSettings>): Promise<void> {
  const sheets = getSheetsClient()

  // Read existing to preserve other keys
  const rows = await getSheetValues(`${SHEETS.SETTINGS}!A:B`)
  const map: Record<string, number> = {}
  rows.forEach(([key], i) => { if (key) map[key] = i + 1 })

  const keyMap: Record<keyof OrgSettings, string> = {
    orgName: 'OrgName', orgLegalName: 'OrgLegalName', tagline: 'Tagline',
    logoUrlLight: 'LogoUrlLight', logoUrlDark: 'LogoUrlDark', faviconUrl: 'FaviconUrl',
    websiteUrl: 'WebsiteUrl', primaryEmail: 'PrimaryEmail', supportEmail: 'SupportEmail',
    phoneNumber: 'PhoneNumber', address: 'Address', postalCode: 'PostalCode',
    linkedinUrl: 'LinkedinUrl', otherSocialUrl: 'OtherSocialUrl',
    primaryColor: 'PrimaryColor', secondaryColor: 'SecondaryColor',
    sidebarColor: 'SidebarColor', accentColor: 'AccentColor',
    defaultMode: 'DefaultMode', fontFamily: 'FontFamily',
    reportTitlePrefix: 'ReportTitlePrefix', preparedByDefault: 'PreparedByDefault',
    footerText: 'FooterText', currencySymbol: 'CurrencySymbol',
    currencyCode: 'CurrencyCode',
    currencyFormat: 'CurrencyFormat', dateFormat: 'DateFormat',
    fiscalYearStart: 'FiscalYearStart', includeWatermark: 'IncludeWatermark',
    watermarkText: 'WatermarkText', showRecordedBy: 'ShowRecordedBy',
    categoryLabel: 'CategoryLabel', regionLabel: 'RegionLabel',
    salesRepLabel: 'SalesRepLabel',
    perfThresholdExceeding: 'PerfThresholdExceeding',
    perfThresholdOnTrack: 'PerfThresholdOnTrack',
    perfThresholdAtRisk: 'PerfThresholdAtRisk',
    defaultDashboardPeriod: 'DefaultDashboardPeriod',
    allowDataEdit: 'AllowDataEdit', requireEntryNotes: 'RequireEntryNotes',
  }

  const batchData = []
  const newRows: unknown[][] = []

  for (const [jsKey, value] of Object.entries(updates)) {
    const sheetKey = keyMap[jsKey as keyof OrgSettings]
    if (!sheetKey) continue
    const rowIdx = map[sheetKey]
    if (rowIdx) {
      batchData.push({
        range: `${SHEETS.SETTINGS}!B${rowIdx}`,
        values: [[String(value)]],
      })
    } else {
      newRows.push([sheetKey, String(value)])
    }
  }

  if (batchData.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data: batchData },
    })
  }
  if (newRows.length) {
    await appendRows(SHEETS.SETTINGS, newRows)
  }
}

// ─────────────────────────────────────────────────────────────
// METADATA
// ─────────────────────────────────────────────────────────────

async function _getMetadata(): Promise<OrgMetadata> {
  try {
    const rows = await getSheetValues(`${SHEETS.METADATA}!A:D`)
    // Row 1 is header: Regions | Categories | SalesReps | Statuses
    const data = rows.slice(1)
    return {
      regions:    data.map(r => r[0]).filter(Boolean),
      categories: data.map(r => r[1]).filter(Boolean),
      salesReps:  data.map(r => r[2]).filter(Boolean),
      statuses:   data.map(r => r[3]).filter(Boolean).length
                  ? data.map(r => r[3]).filter(Boolean)
                  : ['Active', 'Inactive'],
    }
  } catch {
    return { regions: [], categories: [], salesReps: [], statuses: ['Active', 'Inactive'] }
  }
}

export async function addMetadataItem(
  column: 'regions' | 'categories' | 'salesReps',
  value: string
): Promise<void> {
  const colMap = { regions: 'A', categories: 'B', salesReps: 'C' }
  const rows = await getSheetValues(`${SHEETS.METADATA}!A:C`)
  const nextRow = rows.length + 1
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.METADATA}!${colMap[column]}${nextRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  })
}

// ─────────────────────────────────────────────────────────────
// SALES DATA
// ─────────────────────────────────────────────────────────────

const SALES_HEADERS = [
  'ID', 'Date', 'Year', 'Month', 'Region', 'Category', 'SalesRep',
  'TargetAmount', 'ActualAmount', 'Status', 'Notes',
  'Variance', 'AchievementPct', 'PerformanceFlag',
  'RecordedBy', 'RecordedByEmail', 'RecordedAt',
]

function rowToRecord(row: string[], settings?: Partial<OrgSettings>): SalesRecord {
  const thresholds = {
    exceeding: safeParseNumber(settings?.perfThresholdExceeding) || 100,
    onTrack:   safeParseNumber(settings?.perfThresholdOnTrack)   || 90,
    atRisk:    safeParseNumber(settings?.perfThresholdAtRisk)    || 75,
  }
  const target = safeParseNumber(row[7])
  const actual = safeParseNumber(row[8])
  const { flag, achievementPct, variance } = computePerformanceFlag(actual, target, thresholds)

  return {
    id:               row[0]  || '',
    date:             row[1]  || '',
    year:             safeParseNumber(row[2]),
    month:            row[3]  || '',
    region:           row[4]  || '',
    category:         row[5]  || '',
    salesRep:         row[6]  || '',
    targetAmount:     target,
    actualAmount:     actual,
    status:           (row[9] as 'Active' | 'Inactive') || 'Active',
    notes:            row[10] || '',
    variance:         safeParseNumber(row[11]) || variance,
    achievementPct:   safeParseNumber(row[12]) || achievementPct,
    performanceFlag:  (row[13] as SalesRecord['performanceFlag']) || flag,
    recordedBy:       row[14] || '',
    recordedByEmail:  row[15] || '',
    recordedAt:       row[16] || '',
  }
}

async function _getSalesRecords(settings?: Partial<OrgSettings>): Promise<SalesRecord[]> {
  try {
    const rows = await getSheetValues(`${SHEETS.SALES}!A:Q`)
    if (rows.length < 2) return []
    return rows.slice(1).filter(r => r[0]).map(r => rowToRecord(r, settings))
  } catch {
    return []
  }
}

export async function createSalesRecord(
  input: SalesRecordInput,
  user: { name: string; email: string },
  settings?: Partial<OrgSettings>
): Promise<SalesRecord> {
  const thresholds = {
    exceeding: settings?.perfThresholdExceeding ?? 100,
    onTrack:   settings?.perfThresholdOnTrack   ?? 90,
    atRisk:    settings?.perfThresholdAtRisk    ?? 75,
  }

  const date = new Date(input.date)
  const { flag, achievementPct, variance } = computePerformanceFlag(
    input.actualAmount, input.targetAmount, thresholds
  )

  const record: SalesRecord = {
    id:              generateId('VTG-'),
    date:            input.date,
    year:            date.getFullYear(),
    month:           MONTHS[date.getMonth()],
    region:          input.region,
    category:        input.category,
    salesRep:        input.salesRep,
    targetAmount:    input.targetAmount,
    actualAmount:    input.actualAmount,
    status:          input.status,
    notes:           input.notes || '',
    variance,
    achievementPct,
    performanceFlag: flag,
    recordedBy:      user.name,
    recordedByEmail: user.email,
    recordedAt:      new Date().toISOString(),
  }

  // Write header row if sheet is empty
  const existing = await getSheetValues(`${SHEETS.SALES}!A1:A1`)
  if (!existing.length || !existing[0][0]) {
    await appendRows(SHEETS.SALES, [SALES_HEADERS])
  }

  await appendRows(SHEETS.SALES, [[
    record.id, record.date, record.year, record.month,
    record.region, record.category, record.salesRep,
    record.targetAmount, record.actualAmount, record.status, record.notes,
    record.variance, record.achievementPct, record.performanceFlag,
    record.recordedBy, record.recordedByEmail, record.recordedAt,
  ]])

  return record
}

export async function bulkCreateSalesRecords(
  inputs: SalesRecordInput[],
  user: { name: string; email: string },
  settings?: Partial<OrgSettings>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const thresholds = {
    exceeding: settings?.perfThresholdExceeding ?? 100,
    onTrack:   settings?.perfThresholdOnTrack   ?? 90,
    atRisk:    settings?.perfThresholdAtRisk    ?? 75,
  }

  const rows: unknown[][] = []
  const errors: string[] = []
  let failed = 0

  for (const [i, input] of inputs.entries()) {
    try {
      const date = new Date(input.date)
      const { flag, achievementPct, variance } = computePerformanceFlag(
        input.actualAmount, input.targetAmount, thresholds
      )
      rows.push([
        generateId('VTG-'), input.date, date.getFullYear(), MONTHS[date.getMonth()],
        input.region, input.category, input.salesRep,
        input.targetAmount, input.actualAmount, input.status, input.notes || '',
        variance, achievementPct, flag,
        user.name, user.email, new Date().toISOString(),
      ])
    } catch (e) {
      failed++
      errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  if (rows.length) {
    const existing = await getSheetValues(`${SHEETS.SALES}!A1:A1`)
    if (!existing.length || !existing[0][0]) {
      await appendRows(SHEETS.SALES, [SALES_HEADERS])
    }
    await appendRows(SHEETS.SALES, rows)
  }

  return { success: rows.length, failed, errors }
}

// ─────────────────────────────────────────────────────────────
// AUTHORIZED USERS
// ─────────────────────────────────────────────────────────────

async function _getAuthorizedUsers(): Promise<AuthorizedUser[]> {
  try {
    const rows = await getSheetValues(`${SHEETS.USERS}!A:D`)
    return rows.slice(1).filter(r => r[0]).map(r => ({
      email:    r[0],
      role:     (r[1] as AuthorizedUser['role']) || 'Viewer',
      addedAt:  r[2] || '',
      addedBy:  r[3] || '',
    }))
  } catch {
    return []
  }
}

export async function getUserRole(email: string): Promise<AuthorizedUser['role'] | null> {
  // Admin bootstrap from env
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())
  if (adminEmails.includes(email)) return 'Admin'

  try {
    const users = await getAuthorizedUsers()
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    return found?.role ?? null
  } catch {
    return null
  }
}

export async function upsertAuthorizedUser(
  user: Omit<AuthorizedUser, 'addedAt'>,
  addedBy: string
): Promise<void> {
  const rows = await getSheetValues(`${SHEETS.USERS}!A:D`)
  const idx = rows.findIndex(r => r[0]?.toLowerCase() === user.email.toLowerCase())

  if (idx >= 0) {
    await updateRow(SHEETS.USERS, idx + 1, [
      user.email, user.role, rows[idx][2], rows[idx][3],
    ])
  } else {
    const existing = rows.length < 1 || !rows[0][0]
    if (existing) {
      await appendRows(SHEETS.USERS, [['Email', 'Role', 'AddedAt', 'AddedBy']])
    }
    await appendRows(SHEETS.USERS, [
      [user.email, user.role, new Date().toISOString(), addedBy],
    ])
  }
}

// ─────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────

export async function logAuditEvent(
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'UPLOAD',
  entityId: string,
  userEmail: string,
  userName: string,
  details: string
): Promise<void> {
  try {
    await appendRows(SHEETS.AUDIT, [[
      new Date().toISOString(), action, entityId,
      userEmail, userName, details,
    ]])
  } catch {
    // Non-blocking — audit log failure should not break main flow
  }
}

// ─────────────────────────────────────────────────────────────
// INITIALIZE SPREADSHEET
// ─────────────────────────────────────────────────────────────
export async function initializeSpreadsheet(): Promise<{ ok: boolean; message: string }> {
  try {
    const sheets = getSheetsClient()
    const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    const existingSheets = res.data.sheets?.map(s => s.properties?.title) ?? []

    const needed = Object.values(SHEETS).filter(name => !existingSheets.includes(name))
    if (needed.length) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: needed.map(title => ({
            addSheet: { properties: { title } },
          })),
        },
      })
    }

    // Write headers if missing
    const salesCheck = await getSheetValues(`${SHEETS.SALES}!A1:A1`)
    if (!salesCheck.length || !salesCheck[0][0]) {
      await appendRows(SHEETS.SALES, [SALES_HEADERS])
    }

    const metaCheck = await getSheetValues(`${SHEETS.METADATA}!A1:A1`)
    if (!metaCheck.length || !metaCheck[0][0]) {
      await appendRows(SHEETS.METADATA, [
        ['Regions', 'Categories', 'SalesReps', 'Statuses'],
        ['North', 'Product A', 'Alice Johnson', 'Active'],
        ['South', 'Product B', 'Bob Smith', 'Inactive'],
        ['East', 'Product C', 'Carol White', ''],
        ['West', 'Product D', 'David Brown', ''],
        ['Central', '', 'Eve Davis', ''],
      ])
    }

    const usersCheck = await getSheetValues(`${SHEETS.USERS}!A1:A1`)
    if (!usersCheck.length || !usersCheck[0][0]) {
      await appendRows(SHEETS.USERS, [['Email', 'Role', 'AddedAt', 'AddedBy']])
    }

    const auditCheck = await getSheetValues(`${SHEETS.AUDIT}!A1:A1`)
    if (!auditCheck.length || !auditCheck[0][0]) {
      await appendRows(SHEETS.AUDIT, [['Timestamp', 'Action', 'EntityId', 'UserEmail', 'UserName', 'Details']])
    }

    return { ok: true, message: `Spreadsheet initialized. Created: ${needed.join(', ') || 'none (all existed)'}` }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Unknown error' }
  }
}
