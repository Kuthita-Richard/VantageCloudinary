import { getSalesRecords, getOrgSettings } from '@/lib/sheets'
import TrendsClient from './TrendsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Monthly Trends' }

export default async function TrendsPage() {
  const [settings, records] = await Promise.all([getOrgSettings(), getSalesRecords()])

  // Aggregate by month/year
  const monthMap = new Map<string, { target: number; actual: number; month: string; year: number; order: number }>()

  records.forEach(r => {
    const key = `${r.year}-${String(r.year * 12 + ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(r.month)).padStart(6,'0')}`
    const cur = monthMap.get(key) ?? { target: 0, actual: 0, month: r.month, year: r.year, order: r.year * 12 + ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(r.month) }
    monthMap.set(key, { ...cur, target: cur.target + r.targetAmount, actual: cur.actual + r.actualAmount })
  })

  const trendData = Array.from(monthMap.values())
    .sort((a, b) => a.order - b.order)
    .map(d => ({
      label:         `${d.month.slice(0,3)} ${d.year}`,
      target:        d.target,
      actual:        d.actual,
      achievementPct: d.target > 0 ? (d.actual / d.target) * 100 : 0,
    }))

  return <TrendsClient data={trendData} settings={settings} />
}
