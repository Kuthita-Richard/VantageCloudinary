'use server'

import { auth } from '@/lib/auth'
import {
  createSalesRecord,
  bulkCreateSalesRecords,
  getOrgSettings,
  updateOrgSettings,
  logAuditEvent,
  upsertAuthorizedUser,
} from '@/lib/sheets'
import { salesEntrySchema, excelRowSchema, authorizedUserSchema } from '@/schemas'
import type { SalesRecordInput, OrgSettings, UserRole } from '@/types'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { safeParseNumber } from '@/lib/utils'
import { z } from 'zod'

// ── Guard helper ──────────────────────────────────────────────
async function requireAuth(minRole?: UserRole) {
  const session = await auth()
  if (!session?.user) throw new Error('Not authenticated')

  if (minRole) {
    const hierarchy: Record<UserRole, number> = { Viewer: 0, DataEntry: 1, Admin: 2 }
    if (hierarchy[session.user.role] < hierarchy[minRole]) {
      throw new Error(`Requires ${minRole} role or higher`)
    }
  }
  return session.user
}

// ─────────────────────────────────────────────────────────────
// SALES ACTIONS
// ─────────────────────────────────────────────────────────────

export async function createSalesEntryAction(
  data: unknown
): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    const user    = await requireAuth('DataEntry')
    const parsed  = salesEntrySchema.parse(data)
    const settings = await getOrgSettings()

    const record = await createSalesRecord(
      parsed as SalesRecordInput,
      { name: user.name, email: user.email },
      settings
    )

    await logAuditEvent('CREATE', record.id, user.email, user.name,
      `New record: ${record.region} / ${record.category} / ${record.salesRep}`)

    revalidatePath('/', 'page')
    revalidatePath('/analysis/region', 'page')
    revalidatePath('/analysis/category', 'page')
    revalidatePath('/analysis/salesrep', 'page')
    revalidatePath('/analysis/trends', 'page')

    return { success: true, message: 'Record saved successfully', id: record.id }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false, message: e.issues.map((i) => i.message).join(', ') }
    }
    return { success: false, message: e instanceof Error ? e.message : 'Unknown error' }
  }
}

// ─────────────────────────────────────────────────────────────
// UPLOAD ACTIONS
// ─────────────────────────────────────────────────────────────

export async function processExcelUploadAction(
  formData: FormData
): Promise<{ success: number; failed: number; errors: string[]; message: string }> {
  try {
    const user = await requireAuth('DataEntry')
    const file = formData.get('file') as File | null
    if (!file) return { success: 0, failed: 0, errors: [], message: 'No file provided' }

    const buffer    = await file.arrayBuffer()
    const workbook  = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rawRows   = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })

    const settings = await getOrgSettings()
    const inputs: SalesRecordInput[] = []
    const errors: string[] = []

    rawRows.forEach((row, i) => {
      try {
        // Flexible column name mapping (case-insensitive)
        const normalize = (key: string) => key.toLowerCase().replace(/[\s_-]/g, '')
        const get = (aliases: string[]): unknown => {
          for (const [k, v] of Object.entries(row)) {
            if (aliases.includes(normalize(k))) return v
          }
          return ''
        }

        const dateRaw = get(['date'])
        const dateStr = dateRaw instanceof Date
          ? dateRaw.toISOString().slice(0, 10)
          : String(dateRaw)

        const parsed = excelRowSchema.parse({
          date:         dateStr,
          region:       String(get(['region', 'branch', 'territory', 'zone'])),
          category:     String(get(['category', 'product', 'service', 'department', 'item'])),
          salesRep:     String(get(['salesrep', 'rep', 'officer', 'agent', 'executive', 'name'])),
          targetAmount: safeParseNumber(get(['targetamount', 'target', 'targetamt', 'goal'])),
          actualAmount: safeParseNumber(get(['actualamount', 'actual', 'actualamt', 'achieved', 'sales'])),
          status:       String(get(['status']) || 'Active') as 'Active' | 'Inactive',
          notes:        String(get(['notes', 'remarks', 'comments']) || ''),
        })
        inputs.push(parsed)
      } catch (e) {
        errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : 'Invalid data'}`)
      }
    })

    const result = await bulkCreateSalesRecords(
      inputs, { name: user.name, email: user.email }, settings
    )

    await logAuditEvent('UPLOAD', 'BULK', user.email, user.name,
      `Uploaded ${result.success} records from ${file.name}`)

    revalidatePath('/', 'page')
    revalidatePath('/analysis/region', 'page')

    return {
      ...result,
      errors: [...errors, ...result.errors],
      message: `Imported ${result.success} records. ${result.failed + errors.length} failed.`,
    }
  } catch (e) {
    return { success: 0, failed: 0, errors: [], message: e instanceof Error ? e.message : 'Unknown error' }
  }
}

// ─────────────────────────────────────────────────────────────
// SETTINGS ACTIONS
// ─────────────────────────────────────────────────────────────

export async function updateSettingsAction(
  updates: Partial<OrgSettings>
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth('Admin')
    await updateOrgSettings(updates)
    revalidatePath('/', 'layout')
    return { success: true, message: 'Settings saved successfully' }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Unknown error' }
  }
}

// ─────────────────────────────────────────────────────────────
// LOGO / IMAGE UPLOAD
// ─────────────────────────────────────────────────────────────

export async function uploadLogoAction(
  formData: FormData,
  field: 'logoUrlLight' | 'logoUrlDark' | 'faviconUrl'
): Promise<{ success: boolean; url?: string; message: string }> {
  try {
    await requireAuth('Admin')
    const file = formData.get('file') as File | null
    if (!file) return { success: false, message: 'No file uploaded' }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/x-icon']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, message: 'File must be PNG, JPG, SVG, WEBP, or ICO' }
    }

    if (file.size > 2 * 1024 * 1024) {
      return { success: false, message: 'File must be under 2MB' }
    }

    const result = await uploadToCloudinary(
      file,
      `${field}-${Date.now()}`
    )

    await updateOrgSettings({ [field]: result.url })
    revalidatePath('/', 'layout')

    return { success: true, url: result.url, message: 'Image uploaded successfully' }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Upload failed' }
  }
}

// ─────────────────────────────────────────────────────────────
// USER MANAGEMENT ACTIONS
// ─────────────────────────────────────────────────────────────

export async function upsertUserAction(
  data: unknown
): Promise<{ success: boolean; message: string }> {
  try {
    const currentUser = await requireAuth('Admin')
    const parsed = authorizedUserSchema.parse(data)

    await upsertAuthorizedUser(
      { email: parsed.email, role: parsed.role as UserRole, addedBy: currentUser.email },
      currentUser.email
    )

    revalidatePath('/settings/app-config', 'page')
    return { success: true, message: `User ${parsed.email} updated to ${parsed.role}` }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Unknown error' }
  }
}
