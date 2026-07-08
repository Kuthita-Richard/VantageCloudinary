import { getSalesRecords, getOrgSettings } from '@/lib/sheets'
import { formatCurrencyCompact, formatPct, computePerformanceFlag, PERFORMANCE_STYLES } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sales Rep Analysis' }

export default async function SalesRepPage() {
  const [settings, records] = await Promise.all([getOrgSettings(), getSalesRecords()])

  const repMap = new Map<string, { actual: number; target: number; count: number; met: number }>()
  records.forEach(r => {
    const cur = repMap.get(r.salesRep) ?? { actual: 0, target: 0, count: 0, met: 0 }
    repMap.set(r.salesRep, {
      actual:  cur.actual  + r.actualAmount,
      target:  cur.target  + r.targetAmount,
      count:   cur.count   + 1,
      met:     cur.met     + (r.actualAmount >= r.targetAmount ? 1 : 0),
    })
  })

  const thresholds = {
    exceeding: settings.perfThresholdExceeding,
    onTrack:   settings.perfThresholdOnTrack,
    atRisk:    settings.perfThresholdAtRisk,
  }

  const data = Array.from(repMap.entries()).map(([rep, d]) => {
    const { flag, achievementPct } = computePerformanceFlag(d.actual, d.target, thresholds)
    return {
      rep, actual: d.actual, target: d.target,
      achievementPct, flag,
      recordCount: d.count,
      hitRate: d.count > 0 ? (d.met / d.count) * 100 : 0,
    }
  }).sort((a, b) => b.achievementPct - a.achievementPct)

  const sym = settings.currencySymbol

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
          {settings.salesRepLabel} Analysis
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>
          Ranked by achievement percentage.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border p-16 text-center"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>No data yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px] w-10"
                  style={{ color: 'var(--muted-fg)' }}>#</th>
                {[settings.salesRepLabel, `Target (${sym})`, `Actual (${sym})`, 'Achievement', 'Hit Rate', 'Records', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]"
                    style={{ color: 'var(--muted-fg)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const style = PERFORMANCE_STYLES[row.flag]
                return (
                  <tr key={row.rep}
                    style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--input)' }}>
                    <td className="px-4 py-3 font-bold tabular-nums" style={{ color: 'var(--muted-fg)' }}>{i + 1}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--fg)' }}>{row.rep}</td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--muted-fg)' }}>{formatCurrencyCompact(row.target, sym)}</td>
                    <td className="px-4 py-3 tabular-nums font-medium" style={{ color: 'var(--fg)' }}>{formatCurrencyCompact(row.actual, sym)}</td>
                    <td className="px-4 py-3 tabular-nums font-bold"
                      style={{ color: row.achievementPct >= 100 ? '#16a34a' : '#dc2626' }}>
                      {formatPct(row.achievementPct)}
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--muted-fg)' }}>
                      {formatPct(row.hitRate)}
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--muted-fg)' }}>{row.recordCount}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${style.bg} ${style.color}`}>
                        {style.emoji} {row.flag}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
