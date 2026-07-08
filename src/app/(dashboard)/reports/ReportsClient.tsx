'use client'

import { useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Printer, Download, FileText, ChevronDown } from 'lucide-react'
import type { SalesRecord, OrgSettings, OrgMetadata } from '@/types'
import { formatCurrencyCompact, formatPct, PERFORMANCE_STYLES, MONTHS } from '@/lib/utils'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

interface Props {
  records:      SalesRecord[]
  settings:     OrgSettings
  metadata:     OrgMetadata
  searchParams: Record<string, string>
}

export default function ReportsClient({ records, settings, metadata, searchParams }: Props) {
  const printRef      = useRef<HTMLDivElement>(null)
  const router        = useRouter()
  const pathname      = usePathname()
  const sp            = useSearchParams()
  const [pending, startTransition] = useTransition()

  const sym = settings.currencySymbol

  const totalTarget    = records.reduce((s, r) => s + r.targetAmount, 0)
  const totalActual    = records.reduce((s, r) => s + r.actualAmount, 0)
  const totalVariance  = totalActual - totalTarget
  const achievementPct = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0
  const targetsMet     = records.filter(r => r.actualAmount >= r.targetAmount).length

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${settings.orgName} — ${settings.reportTitlePrefix} ${new Date().toLocaleDateString()}`,
  })

  const updateFilter = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(sp.toString())
      if (value === 'All') params.delete(key)
      else params.set(key, value)
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const inputStyle = { background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted-fg)' }
  const selCls = 'appearance-none border rounded-lg pl-3 pr-7 py-2 text-xs outline-none cursor-pointer'

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Year filter */}
          <div className="relative">
            <select value={searchParams.year || 'All'} onChange={e => updateFilter('year', e.target.value)}
              className={selCls} style={inputStyle}>
              <option value="All">Year: All</option>
              {[...new Set(records.map(r => String(r.year)))].sort().reverse().map(y =>
                <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-fg)' }} />
          </div>
          {/* Month filter */}
          <div className="relative">
            <select value={searchParams.month || 'All'} onChange={e => updateFilter('month', e.target.value)}
              className={selCls} style={inputStyle}>
              <option value="All">Month: All</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-fg)' }} />
          </div>
          {/* Region filter */}
          <div className="relative">
            <select value={searchParams.region || 'All'} onChange={e => updateFilter('region', e.target.value)}
              className={selCls} style={inputStyle}>
              <option value="All">{settings.regionLabel}: All</option>
              {metadata.regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-fg)' }} />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => handlePrint()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
            <Printer size={14} />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Printable Report */}
      <div ref={printRef} className="space-y-5">
        {/* Report Header */}
        <div className="rounded-xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
                {settings.reportTitlePrefix} {searchParams.month || ''} {searchParams.year || new Date().getFullYear()}
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>{settings.orgLegalName || settings.orgName}</p>
              {searchParams.region && (
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'color-mix(in oklch, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
                  {settings.regionLabel}: {searchParams.region}
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Generated</p>
              <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              {settings.preparedByDefault && (
                <p className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>
                  Prepared by: {settings.preparedByDefault}
                </p>
              )}
            </div>
          </div>

          {/* KPI Summary Grid */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Target Amount',  value: formatCurrencyCompact(totalTarget, sym),     color: '#6366f1' },
              { label: 'Actual Amount',  value: formatCurrencyCompact(totalActual, sym),     color: '#38bdf8' },
              { label: 'Targets Met',    value: `${targetsMet} / ${records.length}`,          color: '#22c55e' },
              { label: 'Variance',       value: `${totalVariance >= 0 ? '+' : ''}${formatCurrencyCompact(totalVariance, sym)}`, color: totalVariance >= 0 ? '#22c55e' : '#ef4444' },
              { label: 'Achievement',    value: formatPct(achievementPct),                   color: '#f59e0b' },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-xl border p-3 text-center"
                style={{ background: 'var(--input)', borderColor: 'var(--border)', borderTop: `2px solid ${kpi.color}` }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted-fg)' }}>{kpi.label}</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{kpi.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Records Table */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <FileText size={14} style={{ color: 'var(--primary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                Detailed Records ({records.length})
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--input)', borderBottom: '1px solid var(--border)' }}>
                  {['Date', settings.regionLabel, settings.categoryLabel, settings.salesRepLabel,
                    `Target (${sym})`, `Actual (${sym})`, 'Achievement', 'Flag',
                    ...(settings.showRecordedBy ? ['Recorded By'] : [])
                  ].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--muted-fg)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const flagStyle = PERFORMANCE_STYLES[r.performanceFlag]
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--input)' }}>
                      <td className="px-3 py-2.5" style={{ color: 'var(--muted-fg)' }}>{r.date}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--fg)' }}>{r.region}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--fg)' }}>{r.category}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--fg)' }}>{r.salesRep}</td>
                      <td className="px-3 py-2.5 tabular-nums text-right" style={{ color: 'var(--fg)' }}>{formatCurrencyCompact(r.targetAmount, sym)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-right" style={{ color: 'var(--fg)' }}>{formatCurrencyCompact(r.actualAmount, sym)}</td>
                      <td className="px-3 py-2.5 tabular-nums font-semibold text-right" style={{ color: r.achievementPct >= 100 ? '#22c55e' : '#ef4444' }}>
                        {formatPct(r.achievementPct)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${flagStyle.bg} ${flagStyle.color}`}>
                          {flagStyle.emoji} {r.performanceFlag}
                        </span>
                      </td>
                      {settings.showRecordedBy && (
                        <td className="px-3 py-2.5" style={{ color: 'var(--muted-fg)' }}>{r.recordedBy}</td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {settings.footerText && (
            <div className="px-4 py-3 border-t text-center" style={{ borderColor: 'var(--border)', background: 'var(--input)' }}>
              <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{settings.footerText}</p>
              {settings.primaryEmail && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                  {settings.orgName} · {settings.primaryEmail}
                  {settings.phoneNumber && ` · ${settings.phoneNumber}`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
