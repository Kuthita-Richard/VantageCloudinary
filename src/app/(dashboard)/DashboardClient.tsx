'use client'

/**
 * DashboardClient.tsx — Interactive dashboard with Power BI–style drill-through
 *
 * Drill-through behaviour:
 *   Clicking any bar, cell or region navigates to the matching analysis page
 *   with that item pre-filtered via URL search params — exactly like Power BI's
 *   right-click → Drill through, but with a single click.
 *
 * Chart library: Recharts (already installed, no extra deps needed)
 */

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Target, DollarSign, CheckCircle, Activity, TrendingUp, ChevronDown, MousePointerClick } from 'lucide-react'
import { cn, formatCurrencyCompact, formatPct, PERFORMANCE_STYLES, MONTHS } from '@/lib/utils'
import { CURRENCIES } from '@/lib/currency'
import type { DashboardKPIs, RegionChartData, CategoryChartData, DashboardFilters, OrgSettings, OrgMetadata } from '@/types'

// ── Shared tooltip ─────────────────────────────────────────────
const ChartTooltip = ({
  active, payload, label, symbol = '$', drillHint,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
  symbol?: string
  drillHint?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border p-3 shadow-xl text-xs min-w-[150px]"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <p className="font-bold mb-2 text-[11px]" style={{ color: 'var(--fg)' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0" style={{ background: p.color }} />
            <span style={{ color: 'var(--muted-fg)' }}>{p.name}</span>
          </div>
          <strong style={{ color: 'var(--fg)' }}>
            {Math.abs(p.value) > 100
              ? formatCurrencyCompact(p.value, symbol)
              : `${Number(p.value).toFixed(1)}%`}
          </strong>
        </div>
      ))}
      {drillHint && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <MousePointerClick size={10} style={{ color: 'var(--primary)' }} />
          <span className="text-[10px]" style={{ color: 'var(--primary)' }}>{drillHint}</span>
        </div>
      )}
    </div>
  )
}

// ── KPI card ───────────────────────────────────────────────────
const KPICard = ({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string; sub?: string
  icon: React.ElementType; accent: string
}) => (
  <div className="rounded-xl border p-4 card-hover"
    style={{ background: 'var(--card)', borderColor: 'var(--border)', borderTop: `3px solid ${accent}` }}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--muted-fg)' }}>{label}</span>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `color-mix(in oklch, ${accent} 12%, transparent)` }}>
        <Icon size={15} color={accent} />
      </div>
    </div>
    <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{value}</p>
    {sub && <p className="text-[10px] mt-1 font-medium" style={{ color: 'var(--muted-fg)' }}>{sub}</p>}
  </div>
)

// ── Filter select ──────────────────────────────────────────────
const FilterSelect = ({
  label, value, options, onChange, loading,
}: {
  label: string; value: string; options: string[]
  onChange: (v: string) => void; loading: boolean
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={loading}
      className="appearance-none border rounded-lg pl-3 pr-8 py-2 text-xs font-medium
                 cursor-pointer outline-none disabled:opacity-50 transition-all"
      style={{
        background:  'var(--card)',
        borderColor: value !== 'All' ? 'var(--primary)' : 'var(--border)',
        color:       value !== 'All' ? 'var(--primary)' : 'var(--muted-fg)',
        boxShadow:   value !== 'All' ? '0 0 0 2px color-mix(in oklch, var(--primary) 20%, transparent)' : 'none',
      }}
    >
      <option value="All">{label}: All</option>
      {options.map(o => (
        <option key={o} value={o} style={{ background: 'var(--card)', color: 'var(--fg)' }}>{o}</option>
      ))}
    </select>
    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
      style={{ color: 'var(--muted-fg)' }} />
  </div>
)

// ── Section card wrapper ───────────────────────────────────────
const ChartCard = ({
  title, subtitle, children,
}: {
  title: string; subtitle?: string; children: React.ReactNode
}) => (
  <div className="rounded-xl border bg-white" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
    <div className="px-5 pt-4 pb-2">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-fg)' }}>{title}</p>
      {subtitle && <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>{subtitle}</p>}
    </div>
    <div className="px-4 pb-4">{children}</div>
  </div>
)

// ── Props ──────────────────────────────────────────────────────
interface Props {
  kpis:                   DashboardKPIs
  regionData:             RegionChartData[]
  categoryData:           CategoryChartData[]
  gaugePct:               number
  filters:                DashboardFilters
  settings:               OrgSettings
  metadata:               OrgMetadata
  years:                  string[]
  totalRecords:           number
  displayCurrency:        string        // ISO code of currently displayed currency
  baseCurrency:           string        // ISO code of org's base currency
  displaySymbol:          string        // Symbol for display (e.g. "KSh", "$")
  exchangeRateUpdatedAt:  string | null // When rates were last updated
}

// ── Main ───────────────────────────────────────────────────────
export default function DashboardClient({
  kpis, regionData, categoryData, gaugePct,
  filters, settings, metadata, years, totalRecords,
  displayCurrency, baseCurrency, displaySymbol, exchangeRateUpdatedAt,
}: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const sym = displaySymbol

  // ── Filter update ────────────────────────────────────────────
  const updateFilter = useCallback((key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'All') params.delete(key)
      else params.set(key, value)
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [pathname, router, searchParams])

  const updateCurrency = useCallback((code: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (code === baseCurrency) params.delete('currency')
      else params.set('currency', code)
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [pathname, router, searchParams, baseCurrency])

  const resetFilters = () => startTransition(() => router.push(pathname))
  const hasFilters   = Object.values(filters).some(v => v !== 'All')
  const isConverted  = displayCurrency !== baseCurrency

  // ── Drill-through navigation ──────────────────────────────────
  // Mirrors Power BI's "Drill through" — one click from a chart bar
  // to the detail page, pre-filtered to that specific item.
  const drillRegion   = (region: string)   => router.push(`/analysis/region?region=${encodeURIComponent(region)}`)
  const drillCategory = (category: string) => router.push(`/analysis/category?category=${encodeURIComponent(category)}`)

  // ── Gauge data ────────────────────────────────────────────────
  const gaugeData = [
    { name: 'Achieved',  value: Math.min(gaugePct, 100) },
    { name: 'Remaining', value: Math.max(0, 100 - gaugePct) },
  ]
  const flagStyle = PERFORMANCE_STYLES[kpis.performanceFlag]

  // ── Power BI colour palette for charts ────────────────────────
  const PBI = {
    actual:   '#2878d6',   // Power BI primary teal-blue
    target:   '#a8c8f0',   // Lighter blue for target bars
    positive: '#217346',   // Excel/PBI green
    negative: '#c0392b',   // PBI red
    region:   '#2878d6',   // Horizontal bars
  }

  return (
    <div className="space-y-4">

      {/* ── Filter bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center p-3 rounded-xl border"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <FilterSelect label="Year"    value={filters.year}    options={years.length ? years : ['2024']} onChange={v => updateFilter('year', v)}    loading={pending} />
        <FilterSelect label="Month"   value={filters.month}   options={MONTHS}    onChange={v => updateFilter('month', v)}   loading={pending} />
        <FilterSelect label={settings.regionLabel}   value={filters.region}   options={metadata.regions}    onChange={v => updateFilter('region', v)}   loading={pending} />
        <FilterSelect label={settings.categoryLabel} value={filters.category} options={metadata.categories} onChange={v => updateFilter('category', v)} loading={pending} />
        <FilterSelect label={settings.salesRepLabel} value={filters.salesRep} options={metadata.salesReps}  onChange={v => updateFilter('salesRep', v)} loading={pending} />
        <FilterSelect label="Status"  value={filters.status}  options={['Active','Inactive']} onChange={v => updateFilter('status', v)}  loading={pending} />
        <FilterSelect label="Performance" value={filters.performanceFlag}
          options={['Exceeding','On Track','At Risk','Below Target']}
          onChange={v => updateFilter('performanceFlag', v)} loading={pending} />

        {/* ── Currency converter ──────────────────────────── */}
        <div className="relative ml-auto">
          <select
            value={displayCurrency}
            onChange={e => updateCurrency(e.target.value)}
            disabled={pending}
            className="appearance-none border-2 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold
                       cursor-pointer outline-none disabled:opacity-50 transition-all"
            style={{
              background:  isConverted ? 'color-mix(in oklch, var(--primary) 10%, transparent)' : 'var(--card)',
              borderColor: isConverted ? 'var(--primary)' : 'var(--border)',
              color:       isConverted ? 'var(--primary)' : 'var(--muted-fg)',
            }}
          >
            <optgroup label="── Your base currency ──" style={{ background: 'var(--card)' }}>
              {CURRENCIES.filter(c => c.code === baseCurrency).map(c => (
                <option key={c.code} value={c.code} style={{ background: 'var(--card)' }}>
                  {c.flag} {c.code} — {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="── Convert to ──" style={{ background: 'var(--card)' }}>
              {CURRENCIES.filter(c => c.code !== baseCurrency).map(c => (
                <option key={c.code} value={c.code} style={{ background: 'var(--card)' }}>
                  {c.flag} {c.code} — {c.name}
                </option>
              ))}
            </optgroup>
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--muted-fg)' }} />
        </div>

        {hasFilters && (
          <button onClick={resetFilters}
            className="px-3 py-2 text-xs rounded-lg border font-medium transition-all hover:opacity-70"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)', background: 'var(--muted)' }}>
            Reset all
          </button>
        )}
        {pending && <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>Updating…</span>}
      </div>

      {/* ── Conversion notice ────────────────────────────────── */}
      {isConverted && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{
            background:  'color-mix(in oklch, var(--primary) 8%, transparent)',
            border:      '1px solid color-mix(in oklch, var(--primary) 25%, transparent)',
            color:       'var(--primary)',
          }}>
          <span>💱</span>
          <span>
            Showing values converted from <strong>{baseCurrency}</strong> to{' '}
            <strong>{displayCurrency}</strong> using live exchange rates
            {exchangeRateUpdatedAt ? ` · Updated: ${exchangeRateUpdatedAt.slice(0, 16)}` : ''}
          </span>
          <button
            onClick={() => updateCurrency(baseCurrency)}
            className="ml-auto underline font-semibold hover:opacity-70"
          >
            Reset
          </button>
        </div>
      )}

      {/* ── KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KPICard label="Target Amount" value={formatCurrencyCompact(kpis.targetAmount, sym)} icon={Target}     accent="#0284c7" />
        <KPICard label="Actual Amount" value={formatCurrencyCompact(kpis.actualAmount, sym)} icon={DollarSign} accent="#0369a1" />
        <KPICard label="Targets Met"   value={String(kpis.targetsMet)} sub={`of ${totalRecords} records`}      icon={CheckCircle} accent="#16a34a" />
        <KPICard
          label="Variance"
          value={`${kpis.variance >= 0 ? '+' : ''}${formatCurrencyCompact(kpis.variance, sym)}`}
          icon={Activity}
          accent={kpis.variance >= 0 ? '#16a34a' : '#dc2626'}
        />
        <KPICard
          label="Achievement"
          value={formatPct(kpis.achievementPct)}
          sub={kpis.performanceFlag}
          icon={TrendingUp}
          accent="#d97706"
        />
      </div>

      {/* ── Row 2: Gauge | Variance by Category | Target Met by Region ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* ── Gauge – Target Met % ──────────────────────────── */}
        <ChartCard title="Target Met %">
          <div className="relative flex flex-col items-center">
            <div className="w-full" style={{ maxWidth: 260, margin: '0 auto' }}>
              <PieChart width={230} height={130}>
                <Pie
                  data={gaugeData}
                  cx={115} cy={122}
                  startAngle={180} endAngle={0}
                  innerRadius={68} outerRadius={100}
                  dataKey="value"
                  strokeWidth={0}
                  isAnimationActive
                >
                  <Cell fill={PBI.actual} />
                  <Cell fill="#dbeafe" />
                </Pie>
              </PieChart>
            </div>
            <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none">
              <p className="text-2xl md:text-3xl font-extrabold tabular-nums" style={{ color: PBI.actual }}>
                {formatPct(gaugePct)}
              </p>
              <span className={cn(
                'inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-0.5',
                flagStyle.bg, flagStyle.color
              )}>
                {flagStyle.emoji} {kpis.performanceFlag}
              </span>
            </div>
          </div>
          <div className="flex justify-between px-6 mt-1">
            <span className="text-[10px] font-medium" style={{ color: 'var(--muted-fg)' }}>0%</span>
            <span className="text-[10px] font-medium" style={{ color: 'var(--muted-fg)' }}>100%</span>
          </div>
        </ChartCard>

        {/* ── Variance % by Category — drill-through ────────── */}
        <ChartCard
          title={`Variance % by ${settings.categoryLabel}`}
          subtitle={`Click a bar to drill into that ${settings.categoryLabel.toLowerCase()}`}
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={categoryData} margin={{ top: 18, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="category" tick={{ fill: 'var(--muted-fg)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted-fg)', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v.toFixed(0)}%`} />
              <Tooltip content={<ChartTooltip symbol={sym} drillHint={`Click to see ${settings.categoryLabel} details`} />} />
              <Bar
                dataKey="variancePct"
                name="Variance"
                radius={[3, 3, 0, 0]}
                cursor="pointer"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(d: any) => drillCategory(d.category)}
                label={{
                  position: 'top', fontSize: 9, fill: 'var(--muted-fg)',
                  formatter: (v: unknown) => `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1)}%`,
                }}
              >
                {categoryData.map((d, i) => (
                  <Cell key={i} fill={d.variancePct >= 0 ? PBI.positive : PBI.negative} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── Target Met % by Region — drill-through ──────────── */}
        <ChartCard
          title={`Target Met % by ${settings.regionLabel}`}
          subtitle={`Click a bar to drill into that ${settings.regionLabel.toLowerCase()}`}
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={regionData} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" domain={[0, 120]} tick={{ fill: 'var(--muted-fg)', fontSize: 10 }}
                axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="region" width={58}
                tick={{ fill: 'var(--muted-fg)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip symbol={sym} drillHint={`Click to see ${settings.regionLabel} details`} />} />
              <Bar
                dataKey="targetMetPct"
                name="Target Met"
                fill={PBI.region}
                radius={[0, 3, 3, 0]}
                cursor="pointer"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(d: any) => drillRegion(d.region)}
                label={{
                  position: 'right', fontSize: 9, fill: 'var(--muted-fg)',
                  formatter: (v: unknown) => `${Number(v).toFixed(1)}%`,
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 3: Actual vs Target by Region — drill-through ── */}
      <ChartCard
        title={`Actual vs Target by ${settings.regionLabel}`}
        subtitle={`Click any bar to drill through to that ${settings.regionLabel.toLowerCase()}'s full breakdown`}
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={regionData} margin={{ top: 12, right: 24, left: 12, bottom: 0 }}
            barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="region" tick={{ fill: 'var(--muted-fg)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted-fg)', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => formatCurrencyCompact(v, sym)} />
            <Tooltip content={<ChartTooltip symbol={sym} drillHint={`Click to drill through`} />} />
            <Legend
              formatter={v => <span style={{ color: 'var(--muted-fg)', fontSize: 11 }}>{v}</span>}
              wrapperStyle={{ paddingTop: 12 }}
            />
            <Bar
              dataKey="actual" name="Actual Amount"
              fill={PBI.actual} radius={[3, 3, 0, 0]} barSize={28}
              cursor="pointer"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(d: any) => drillRegion(d.region)}
            />
            <Bar
              dataKey="target" name="Target Amount"
              fill={PBI.target} radius={[3, 3, 0, 0]} barSize={28}
              cursor="pointer"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(d: any) => drillRegion(d.region)}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

    </div>
  )
}
