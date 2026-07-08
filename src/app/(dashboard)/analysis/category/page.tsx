import { getSalesRecords, getOrgSettings } from '@/lib/sheets'
import CategoryClient from './CategoryClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Category Analysis' }

export default async function CategoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp                     = await searchParams
  const [settings, allRecords] = await Promise.all([getOrgSettings(), getSalesRecords()])

  const drillCategory = sp.category ?? null
  const records       = drillCategory
    ? allRecords.filter(r => r.category === drillCategory)
    : allRecords

  const catMap = new Map<string, { actual: number; target: number; count: number }>()
  records.forEach(r => {
    const cur = catMap.get(r.category) ?? { actual: 0, target: 0, count: 0 }
    catMap.set(r.category, {
      actual: cur.actual + r.actualAmount,
      target: cur.target + r.targetAmount,
      count:  cur.count  + 1,
    })
  })

  const data = Array.from(catMap.entries()).map(([category, d]) => ({
    category,
    actual:         d.actual,
    target:         d.target,
    variancePct:    d.target > 0 ? ((d.actual - d.target) / d.target) * 100 : 0,
    achievementPct: d.target > 0 ? (d.actual / d.target) * 100 : 0,
    recordCount:    d.count,
  })).sort((a, b) => b.achievementPct - a.achievementPct)

  return <CategoryClient data={data} settings={settings} drillFilter={drillCategory} />
}
