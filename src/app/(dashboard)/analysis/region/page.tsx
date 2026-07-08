/**
 * analysis/region/page.tsx
 *
 * Receives an optional ?region= search param from dashboard drill-through.
 * When present, pre-filters the table and chart to that region — 
 * matching Power BI's drill-through destination page behaviour.
 */
import { getSalesRecords, getOrgSettings } from '@/lib/sheets'
import RegionClient from './RegionClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Region Analysis' }

export default async function RegionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp                       = await searchParams
  const [settings, allRecords]   = await Promise.all([getOrgSettings(), getSalesRecords()])

  // Drill-through filter — set when navigating from dashboard chart click
  const drillRegion = sp.region ?? null
  const records     = drillRegion
    ? allRecords.filter(r => r.region === drillRegion)
    : allRecords

  const regionMap = new Map<string, { actual: number; target: number; count: number; met: number }>()
  records.forEach(r => {
    const cur = regionMap.get(r.region) ?? { actual: 0, target: 0, count: 0, met: 0 }
    regionMap.set(r.region, {
      actual:  cur.actual  + r.actualAmount,
      target:  cur.target  + r.targetAmount,
      count:   cur.count   + 1,
      met:     cur.met     + (r.actualAmount >= r.targetAmount ? 1 : 0),
    })
  })

  const data = Array.from(regionMap.entries()).map(([region, d]) => ({
    region,
    actual:         d.actual,
    target:         d.target,
    variance:       d.actual - d.target,
    variancePct:    d.target > 0 ? ((d.actual - d.target) / d.target) * 100 : 0,
    achievementPct: d.target > 0 ? (d.actual / d.target) * 100 : 0,
    targetMetPct:   d.count  > 0 ? (d.met / d.count) * 100 : 0,
    recordCount:    d.count,
  })).sort((a, b) => b.achievementPct - a.achievementPct)

  return <RegionClient data={data} settings={settings} drillFilter={drillRegion} />
}
