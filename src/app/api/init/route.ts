/**
 * GET /api/init
 *
 * Initialises the Google Spreadsheet on first run.
 * Creates any missing tabs and writes header rows.
 *
 * Called automatically by the dashboard layout on first load,
 * or manually by visiting /api/init in the browser.
 *
 * Safe to call multiple times — existing tabs and data are never overwritten.
 *
 * Returns JSON: { ok: boolean, message: string }
 */
import { NextResponse } from 'next/server'
import { initializeSpreadsheet } from '@/lib/sheets'
import { auth } from '@/lib/auth'

export async function GET() {
  // Only authenticated users can trigger initialisation
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: 'Not authenticated' }, { status: 401 })
  }

  const result = await initializeSpreadsheet()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
