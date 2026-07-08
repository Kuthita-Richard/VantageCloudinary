import { auth }                from '@/lib/auth'
import { getSalesRecords, getOrgSettings, getMetadata } from '@/lib/sheets'
import { getExchangeRates }   from '@/lib/currency'
import { computePerformanceFlag, formatCurrencyCompact, MONTHS } from '@/lib/utils'
import type {
  DashboardKPIs, RegionChartData, CategoryChartData,
  DashboardFilters, SalesRecord, OrgSettings,
} from '@/types'
import DashboardClient from './DashboardClient'

function aggregateData(
  records:  SalesRecord[],
  settings: OrgSettings
) {
  const thresholds = {
    exceeding: settings.perfThresholdExceeding,
    onTrack:   settings.perfThresholdOnTrack,
    atRisk:    settings.perfThresholdAtRisk,
  }

  const totalTarget    = records.reduce((s, r) => s + r.targetAmount, 0)
  const totalActual    = records.reduce((s, r) => s + r.actualAmount, 0)
  const targetsMet     = records.filter(r => r.actualAmount >= r.targetAmount).length
  const { flag, achievementPct, variance } = computePerformanceFlag(
    totalActual, totalTarget, thresholds
  )

  const kpis: DashboardKPIs = {
    targetAmount: totalTarget,
    actualAmount: totalActual,
    targetsMet,
    totalRecords: records.length,
    variance,
    achievementPct,
    performanceFlag: flag,
  }

  const regionMap = new Map<string, { actual: number; target: number }>()
  records.forEach(r => {
    const cur = regionMap.get(r.region) ?? { actual: 0, target: 0 }
    regionMap.set(r.region, { actual: cur.actual + r.actualAmount, target: cur.target + r.targetAmount })
  })

  const regionData: RegionChartData[] = Array.from(regionMap.entries()).map(([region, d]) => ({
    region,
    actual:         d.actual,
    target:         d.target,
    variancePct:    d.target ? ((d.actual - d.target) / d.target) * 100 : 0,
    targetMetPct:   d.target ? (d.actual / d.target) * 100 : 0,
  })).sort((a, b) => b.targetMetPct - a.targetMetPct)

  const catMap = new Map<string, { actual: number; target: number }>()
  records.forEach(r => {
    const cur = catMap.get(r.category) ?? { actual: 0, target: 0 }
    catMap.set(r.category, { actual: cur.actual + r.actualAmount, target: cur.target + r.targetAmount })
  })

  const categoryData: CategoryChartData[] = Array.from(catMap.entries()).map(([category, d]) => ({
    category,
    actual:      d.actual,
    target:      d.target,
    variancePct: d.target ? ((d.actual - d.target) / d.target) * 100 : 0,
  })).sort((a, b) => b.variancePct - a.variancePct)

  return { kpis, regionData, categoryData, gaugePct: Math.min(achievementPct, 100) }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp = await searchParams

  const filters: DashboardFilters = {
    year:            sp.year            || 'All',
    month:           sp.month           || 'All',
    region:          sp.region          || 'All',
    category:        sp.category        || 'All',
    salesRep:        sp.salesRep        || 'All',
    status:          sp.status          || 'All',
    performanceFlag: sp.performanceFlag || 'All',
  }

  // Display currency selected by user (URL param), falls back to org base currency
  const displayCurrency = sp.currency || null

  const [settings, metadata] = await Promise.all([
    getOrgSettings(),
    getMetadata(),
  ])

  // Fetch exchange rates if user selected a different display currency
  const baseCurrencyCode = settings.currencyCode || 'USD'
  const targetCurrency   = displayCurrency || baseCurrencyCode
  const needsConversion  = targetCurrency !== baseCurrencyCode

  const [records, exchangeRates] = await Promise.all([
    getSalesRecords(settings),
    needsConversion
      ? getExchangeRates(baseCurrencyCode)
      : Promise.resolve(null),
  ])

  // Apply filters
  let filtered = records
  if (filters.year    !== 'All') filtered = filtered.filter(r => String(r.year) === filters.year)
  if (filters.month   !== 'All') filtered = filtered.filter(r => r.month === filters.month)
  if (filters.region  !== 'All') filtered = filtered.filter(r => r.region === filters.region)
  if (filters.category !== 'All') filtered = filtered.filter(r => r.category === filters.category)
  if (filters.salesRep !== 'All') filtered = filtered.filter(r => r.salesRep === filters.salesRep)
  if (filters.status  !== 'All') filtered = filtered.filter(r => r.status === filters.status)
  if (filters.performanceFlag !== 'All') {
    filtered = filtered.filter(r => r.performanceFlag === filters.performanceFlag)
  }

  // Apply currency conversion to all monetary values if needed
  const conversionRate = exchangeRates?.rates[targetCurrency] ?? 1
  const convertedRecords = needsConversion
    ? filtered.map(r => ({
        ...r,
        targetAmount: r.targetAmount * conversionRate,
        actualAmount: r.actualAmount * conversionRate,
        variance:     r.variance     * conversionRate,
      }))
    : filtered

  const { kpis, regionData, categoryData, gaugePct } = aggregateData(convertedRecords, settings)

  const years = [...new Set(records.map(r => String(r.year)))].sort().reverse()

  // Currency symbol for the selected display currency
  const { getCurrencySymbol } = await import('@/lib/currency')
  const displaySymbol = needsConversion
    ? getCurrencySymbol(targetCurrency)
    : settings.currencySymbol

  return (
    <DashboardClient
      kpis={kpis}
      regionData={regionData}
      categoryData={categoryData}
      gaugePct={gaugePct}
      filters={filters}
      settings={settings}
      metadata={metadata}
      years={years}
      totalRecords={filtered.length}
      displayCurrency={targetCurrency}
      baseCurrency={baseCurrencyCode}
      displaySymbol={displaySymbol}
      exchangeRateUpdatedAt={exchangeRates?.updatedAt ?? null}
    />
  )
}
