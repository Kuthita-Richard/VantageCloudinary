import { getSalesRecords, getOrgSettings, getMetadata } from '@/lib/sheets'
import ReportsClient from './ReportsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reports & PDF' }

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp = await searchParams
  const [settings, metadata, records] = await Promise.all([
    getOrgSettings(),
    getMetadata(),
    getSalesRecords(),
  ])

  // Filter by search params
  let filtered = records
  if (sp.year)   filtered = filtered.filter(r => String(r.year) === sp.year)
  if (sp.month)  filtered = filtered.filter(r => r.month === sp.month)
  if (sp.region) filtered = filtered.filter(r => r.region === sp.region)

  return <ReportsClient records={filtered} settings={settings} metadata={metadata} searchParams={sp} />
}
